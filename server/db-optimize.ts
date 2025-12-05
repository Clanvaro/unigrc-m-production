import { pool } from './db';
import fs from 'fs';
import path from 'path';

/**
 * Run database performance optimizations
 * This includes VACUUM ANALYZE and creating missing indexes
 */
export async function runDatabaseOptimizations(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!pool) {
        return { success: false, message: 'Database pool not initialized' };
    }

    try {
        console.log('🔧 Starting database optimizations...');

        const results: string[] = [];

        // 1. VACUUM ANALYZE critical tables
        console.log('📊 Running VACUUM ANALYZE on critical tables...');
        const tables = ['risks', 'controls', 'risk_controls', 'macroprocesos', 'processes'];

        for (const table of tables) {
            try {
                await pool.query(`VACUUM ANALYZE ${table}`);
                results.push(`✅ VACUUM ANALYZE ${table} - OK`);
                console.log(`✅ VACUUM ANALYZE ${table} completed`);
            } catch (error: any) {
                results.push(`❌ VACUUM ANALYZE ${table} - ${error.message}`);
                console.error(`❌ VACUUM ANALYZE ${table} failed:`, error.message);
            }
        }

        // 2. Create missing indexes
        console.log('🔍 Creating missing indexes...');

        const indexes = [
            {
                name: 'idx_risks_deleted_at',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_deleted_at ON risks(deleted_at) WHERE deleted_at IS NULL'
            },
            {
                name: 'idx_controls_deleted_at',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_deleted_at ON controls(deleted_at) WHERE deleted_at IS NULL'
            },
            {
                name: 'idx_macroprocesos_deleted_at',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroprocesos_deleted_at ON macroprocesos(deleted_at) WHERE deleted_at IS NULL'
            },
            {
                name: 'idx_risks_status',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_status ON risks(status) WHERE deleted_at IS NULL'
            },
            {
                name: 'idx_risks_status_deleted',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_status_deleted ON risks(status, deleted_at)'
            },
            {
                name: 'idx_risk_controls_risk_id',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_risk_id ON risk_controls(risk_id) WHERE deleted_at IS NULL'
            },
            {
                name: 'idx_risk_controls_control_id',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_control_id ON risk_controls(control_id) WHERE deleted_at IS NULL'
            },
            {
                name: 'idx_controls_effectiveness',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_effectiveness ON controls(effectiveness) WHERE deleted_at IS NULL'
            },
            {
                name: 'idx_risks_process_id',
                sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_process_id ON risks(process_id) WHERE deleted_at IS NULL'
            }
        ];

        for (const index of indexes) {
            try {
                await pool.query(index.sql);
                results.push(`✅ Index ${index.name} - OK`);
                console.log(`✅ Created index: ${index.name}`);
            } catch (error: any) {
                // Ignore "already exists" errors
                if (error.message?.includes('already exists')) {
                    results.push(`ℹ️ Index ${index.name} - Already exists`);
                    console.log(`ℹ️ Index ${index.name} already exists`);
                } else {
                    results.push(`❌ Index ${index.name} - ${error.message}`);
                    console.error(`❌ Failed to create index ${index.name}:`, error.message);
                }
            }
        }

        console.log('✅ Database optimizations completed successfully');

        return {
            success: true,
            message: 'Database optimizations completed',
            details: results
        };

    } catch (error: any) {
        console.error('❌ Database optimization failed:', error);
        return {
            success: false,
            message: `Database optimization failed: ${error.message}`,
            details: error.stack
        };
    }
}
