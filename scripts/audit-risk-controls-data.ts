#!/usr/bin/env tsx
/**
 * Data Auditing Script for Risk-Control Associations
 * Identifies and repairs duplicate, orphaned, or cross-tenant risk_control rows
 * Run this before adding database constraints
 */

import { db } from '../server/db.js';
import { risks, controls, riskControls } from '../server/db/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';

interface DataIssue {
  type: 'orphaned' | 'cross-tenant' | 'duplicate';
  riskControlId: string;
  riskId?: string;
  controlId?: string;
  riskTenantId?: string;
  controlTenantId?: string;
  details: string;
}

async function auditRiskControlsData() {
  console.log('🔍 Starting Risk-Control Data Audit...\n');
  
  const issues: DataIssue[] = [];
  let fixedCount = 0;
  
  try {
    // 1. Get all risk-control associations with parent details
    console.log('📊 Fetching all risk-control associations with parent details...');
    const associations = await db
      .select({
        rc_id: riskControls.id,
        rc_riskId: riskControls.riskId,
        rc_controlId: riskControls.controlId,
        rc_residualRisk: riskControls.residualRisk,
        risk_id: risks.id,
        risk_tenantId: risks.tenantId,
        risk_status: risks.status,
        control_id: controls.id,
        control_tenantId: controls.tenantId,
        control_status: controls.status
      })
      .from(riskControls)
      .leftJoin(risks, eq(riskControls.riskId, risks.id))
      .leftJoin(controls, eq(riskControls.controlId, controls.id));
    
    console.log(`  Found ${associations.length} total associations\n`);
    
    // 2. Check for orphaned associations (missing risk or control)
    console.log('🔎 Checking for orphaned associations...');
    const orphanedAssociations = associations.filter(a => !a.risk_id || !a.control_id);
    
    for (const orphan of orphanedAssociations) {
      issues.push({
        type: 'orphaned',
        riskControlId: orphan.rc_id,
        riskId: orphan.rc_riskId,
        controlId: orphan.rc_controlId,
        details: !orphan.risk_id 
          ? `Risk ${orphan.rc_riskId} does not exist`
          : `Control ${orphan.rc_controlId} does not exist`
      });
    }
    
    if (orphanedAssociations.length > 0) {
      console.log(`  ❌ Found ${orphanedAssociations.length} orphaned associations`);
    } else {
      console.log(`  ✅ No orphaned associations found`);
    }
    
    // 3. Check for cross-tenant associations
    console.log('\n🔐 Checking for cross-tenant associations...');
    const crossTenantAssociations = associations.filter(a => 
      a.risk_tenantId && a.control_tenantId && 
      a.risk_tenantId !== a.control_tenantId
    );
    
    for (const crossTenant of crossTenantAssociations) {
      issues.push({
        type: 'cross-tenant',
        riskControlId: crossTenant.rc_id,
        riskId: crossTenant.rc_riskId,
        controlId: crossTenant.rc_controlId,
        riskTenantId: crossTenant.risk_tenantId!,
        controlTenantId: crossTenant.control_tenantId!,
        details: `Risk belongs to tenant ${crossTenant.risk_tenantId}, Control belongs to tenant ${crossTenant.control_tenantId}`
      });
    }
    
    if (crossTenantAssociations.length > 0) {
      console.log(`  ❌ Found ${crossTenantAssociations.length} cross-tenant associations`);
    } else {
      console.log(`  ✅ No cross-tenant associations found`);
    }
    
    // 4. Check for duplicate associations
    console.log('\n🔄 Checking for duplicate associations...');
    const duplicates = await db.execute(sql`
      SELECT risk_id, control_id, COUNT(*) as count
      FROM risk_controls
      GROUP BY risk_id, control_id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log(`  ❌ Found ${duplicates.rows.length} duplicate risk-control pairs`);
      
      for (const dup of duplicates.rows) {
        // Get all duplicate IDs except the first one
        const duplicateIds = await db
          .select({ id: riskControls.id })
          .from(riskControls)
          .where(and(
            eq(riskControls.riskId, dup.risk_id as string),
            eq(riskControls.controlId, dup.control_id as string)
          ))
          .orderBy(riskControls.id)
          .offset(1); // Keep the first, mark rest as duplicates
        
        for (const dupId of duplicateIds) {
          issues.push({
            type: 'duplicate',
            riskControlId: dupId.id,
            riskId: dup.risk_id as string,
            controlId: dup.control_id as string,
            details: `Duplicate of risk ${dup.risk_id} - control ${dup.control_id} association`
          });
        }
      }
    } else {
      console.log(`  ✅ No duplicate associations found`);
    }
    
    // 5. Summary and repair options
    console.log('\n' + '='.repeat(60));
    console.log('📋 AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total associations: ${associations.length}`);
    console.log(`Issues found: ${issues.length}`);
    console.log(`  - Orphaned: ${issues.filter(i => i.type === 'orphaned').length}`);
    console.log(`  - Cross-tenant: ${issues.filter(i => i.type === 'cross-tenant').length}`);
    console.log(`  - Duplicates: ${issues.filter(i => i.type === 'duplicate').length}`);
    
    if (issues.length > 0) {
      console.log('\n❗ Issues requiring attention:');
      console.log('-'.repeat(60));
      
      // Group issues by type for clearer reporting
      const groupedIssues = {
        orphaned: issues.filter(i => i.type === 'orphaned'),
        'cross-tenant': issues.filter(i => i.type === 'cross-tenant'),
        duplicate: issues.filter(i => i.type === 'duplicate')
      };
      
      for (const [type, typeIssues] of Object.entries(groupedIssues)) {
        if (typeIssues.length > 0) {
          console.log(`\n${type.toUpperCase()} ISSUES (${typeIssues.length}):`);
          for (const issue of typeIssues.slice(0, 5)) {
            console.log(`  - ${issue.details}`);
            console.log(`    Association ID: ${issue.riskControlId}`);
          }
          if (typeIssues.length > 5) {
            console.log(`  ... and ${typeIssues.length - 5} more`);
          }
        }
      }
      
      // Offer to fix issues
      console.log('\n' + '='.repeat(60));
      console.log('🔧 AUTO-FIX OPTIONS');
      console.log('='.repeat(60));
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const question = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
          rl.question(prompt, resolve);
        });
      };
      
      const answer = await question('\nDo you want to automatically fix these issues? (yes/no): ');
      
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        console.log('\n🔧 Fixing issues...');
        
        // Fix orphaned associations
        const orphanedIds = issues
          .filter(i => i.type === 'orphaned')
          .map(i => i.riskControlId);
        
        if (orphanedIds.length > 0) {
          console.log(`  Deleting ${orphanedIds.length} orphaned associations...`);
          await db.delete(riskControls)
            .where(inArray(riskControls.id, orphanedIds));
          fixedCount += orphanedIds.length;
        }
        
        // Fix cross-tenant associations (delete them as they're invalid)
        const crossTenantIds = issues
          .filter(i => i.type === 'cross-tenant')
          .map(i => i.riskControlId);
        
        if (crossTenantIds.length > 0) {
          console.log(`  Deleting ${crossTenantIds.length} cross-tenant associations...`);
          await db.delete(riskControls)
            .where(inArray(riskControls.id, crossTenantIds));
          fixedCount += crossTenantIds.length;
        }
        
        // Fix duplicate associations
        const duplicateIds = issues
          .filter(i => i.type === 'duplicate')
          .map(i => i.riskControlId);
        
        if (duplicateIds.length > 0) {
          console.log(`  Deleting ${duplicateIds.length} duplicate associations...`);
          await db.delete(riskControls)
            .where(inArray(riskControls.id, duplicateIds));
          fixedCount += duplicateIds.length;
        }
        
        console.log(`\n✅ Fixed ${fixedCount} issues successfully!`);
      } else {
        console.log('\n⚠️  Issues not fixed. Please fix manually before adding constraints.');
      }
      
      rl.close();
    } else {
      console.log('\n✅ No data integrity issues found! Database is ready for constraints.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Audit complete');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the audit
auditRiskControlsData();