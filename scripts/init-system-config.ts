import { db, pool } from "../server/db";
import { systemConfig } from "../shared/schema";

async function initSystemConfig() {
  try {
    console.log('[INIT] Initializing system config...');
    
    const configs = [
      {
        configKey: 'risk_aggregation_method',
        configValue: 'weighted',
        description: 'Method for aggregating risk levels (weighted/highest)',
        dataType: 'string',
        isActive: true,
      },
      {
        configKey: 'risk_weight_critical',
        configValue: '0.60',
        description: 'Weight for critical risks in aggregation',
        dataType: 'number',
        isActive: true,
      },
      {
        configKey: 'risk_weight_high',
        configValue: '0.25',
        description: 'Weight for high risks in aggregation',
        dataType: 'number',
        isActive: true,
      },
      {
        configKey: 'risk_weight_medium',
        configValue: '0.10',
        description: 'Weight for medium risks in aggregation',
        dataType: 'number',
        isActive: true,
      },
      {
        configKey: 'risk_weight_low',
        configValue: '0.05',
        description: 'Weight for low risks in aggregation',
        dataType: 'number',
        isActive: true,
      },
      {
        configKey: 'risk_low_max',
        configValue: '6',
        description: 'Maximum inherent risk value for LOW level',
        dataType: 'number',
        isActive: true,
      },
      {
        configKey: 'risk_medium_max',
        configValue: '12',
        description: 'Maximum inherent risk value for MEDIUM level',
        dataType: 'number',
        isActive: true,
      },
      {
        configKey: 'risk_high_max',
        configValue: '19',
        description: 'Maximum inherent risk value for HIGH level',
        dataType: 'number',
        isActive: true,
      },
      {
        configKey: 'max_effectiveness_limit',
        configValue: '100',
        description: 'Maximum control effectiveness limit percentage',
        dataType: 'number',
        isActive: true,
      },
    ];

    for (const config of configs) {
      try {
        await db.insert(systemConfig).values(config).onConflictDoNothing();
        console.log(`[INIT] ✅ ${config.configKey}: ${config.configValue}`);
      } catch (error) {
        console.log(`[INIT] ⚠️  ${config.configKey} already exists or error:`, error);
      }
    }

    console.log('[INIT] System config initialization complete!');
  } catch (error) {
    console.error('[INIT] Error initializing system config:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initSystemConfig();
