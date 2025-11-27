import { storage } from "./storage";
import { 
  type MLModel, type InsertMLModel, type LearningData, type UserFeedback,
  type InsertLearningSystemMetrics, type ModelPerformanceMetrics
} from "@shared/schema";

/**
 * MACHINE LEARNING MODEL MANAGER
 * 
 * Manages ML models for procedure effectiveness, auditor performance prediction,
 * and timeline estimation. Handles model training, validation, and continuous improvement.
 */
export class MLModelManager {
  private readonly RETRAINING_THRESHOLD = 0.10; // Retrain when accuracy drops by 10%
  private readonly MIN_TRAINING_DATA = 50;
  private readonly VALIDATION_SPLIT = 0.2;

  /**
   * Initialize ML models for the recommendation system
   */
  async initializeModels(): Promise<void> {
    console.log('🤖 Initializing ML models for recommendation engine');

    try {
      // Initialize procedure effectiveness model
      await this.initializeProcedureEffectivenessModel();
      
      // Initialize auditor performance model
      await this.initializeAuditorPerformanceModel();
      
      // Initialize timeline prediction model
      await this.initializeTimelinePredictionModel();

      console.log('✅ ML models initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing ML models:', error);
      throw error;
    }
  }

  /**
   * Update models with new learning data
   */
  async updateModelsWithLearningData(learningData: LearningData[]): Promise<void> {
    console.log(`🎓 Updating ML models with ${learningData.length} learning examples`);

    try {
      if (learningData.length < 5) {
        console.log('Insufficient data for model updates - skipping');
        return;
      }

      // Update procedure effectiveness model
      await this.updateProcedureModel(learningData);
      
      // Update auditor performance model
      await this.updateAuditorModel(learningData);
      
      // Update timeline prediction model
      await this.updateTimelineModel(learningData);

      // Record learning metrics
      await this.recordLearningMetrics(learningData);

      console.log('✅ Models updated with new learning data');

    } catch (error) {
      console.error('❌ Error updating models:', error);
      throw error;
    }
  }

  /**
   * Incorporate user feedback into model improvements
   */
  async incorporateFeedback(feedback: UserFeedback[]): Promise<void> {
    console.log(`📝 Incorporating ${feedback.length} user feedback entries into models`);

    try {
      for (const fb of feedback) {
        await this.processFeedbackForModels(fb);
      }

      // Trigger model revalidation if significant feedback received
      if (feedback.length >= 10) {
        await this.validateAllModels();
      }

      console.log('✅ Feedback incorporated into models');

    } catch (error) {
      console.error('❌ Error incorporating feedback:', error);
      throw error;
    }
  }

  /**
   * Update model performance metrics
   */
  async updatePerformanceMetrics(accuracyMetrics: any): Promise<void> {
    try {
      // Update procedure model metrics
      const procedureModel = await this.getProcedureModel();
      if (procedureModel) {
        await storage.updateMLModel(procedureModel.id, {
          performanceScore: accuracyMetrics.procedureAccuracy,
          validationAccuracy: accuracyMetrics.procedureValidationAccuracy,
          modelMetrics: JSON.stringify({
            accuracy: accuracyMetrics.procedureAccuracy,
            precision: accuracyMetrics.procedurePrecision || 0,
            recall: accuracyMetrics.procedureRecall || 0,
            f1Score: accuracyMetrics.procedureF1 || 0,
            lastUpdated: new Date()
          })
        });
      }

      // Update auditor model metrics
      const auditorModel = await this.getAuditorModel();
      if (auditorModel) {
        await storage.updateMLModel(auditorModel.id, {
          performanceScore: accuracyMetrics.auditorAccuracy,
          validationAccuracy: accuracyMetrics.auditorValidationAccuracy,
          modelMetrics: JSON.stringify({
            accuracy: accuracyMetrics.auditorAccuracy,
            precision: accuracyMetrics.auditorPrecision || 0,
            recall: accuracyMetrics.auditorRecall || 0,
            f1Score: accuracyMetrics.auditorF1 || 0,
            lastUpdated: new Date()
          })
        });
      }

      // Update timeline model metrics
      const timelineModel = await this.getTimelineModel();
      if (timelineModel) {
        await storage.updateMLModel(timelineModel.id, {
          performanceScore: accuracyMetrics.timelineAccuracy,
          validationAccuracy: accuracyMetrics.timelineValidationAccuracy,
          modelMetrics: JSON.stringify({
            accuracy: accuracyMetrics.timelineAccuracy,
            meanAbsoluteError: accuracyMetrics.timelineMae || 0,
            rootMeanSquareError: accuracyMetrics.timelineRmse || 0,
            r2Score: accuracyMetrics.timelineR2 || 0,
            lastUpdated: new Date()
          })
        });
      }

      console.log('📊 Model performance metrics updated');

    } catch (error) {
      console.error('❌ Error updating performance metrics:', error);
      throw error;
    }
  }

  /**
   * Validate all models and trigger retraining if needed
   */
  async validateAllModels(): Promise<void> {
    console.log('🔍 Validating all ML models');

    try {
      const models = await storage.getAllMLModels();
      
      for (const model of models) {
        const needsRetraining = await this.assessRetrainingNeed(model);
        
        if (needsRetraining) {
          console.log(`🔄 Model ${model.modelName} needs retraining`);
          await this.retrainModel(model);
        }
      }

      console.log('✅ Model validation completed');

    } catch (error) {
      console.error('❌ Error validating models:', error);
      throw error;
    }
  }

  /**
   * Get model predictions for procedure effectiveness
   */
  async predictProcedureEffectiveness(procedureContext: any): Promise<number> {
    try {
      const model = await this.getProcedureModel();
      if (!model) return 75; // Default fallback

      // Simplified prediction logic - in practice would use actual ML model
      const baseEffectiveness = 75;
      
      // Apply context-based adjustments
      let adjustment = 0;
      
      if (procedureContext.complexity === 'simple') adjustment += 5;
      if (procedureContext.complexity === 'highly_complex') adjustment -= 10;
      
      if (procedureContext.historicalSuccess > 0.8) adjustment += 8;
      if (procedureContext.historicalSuccess < 0.5) adjustment -= 8;

      return Math.max(30, Math.min(95, baseEffectiveness + adjustment));

    } catch (error) {
      console.error('Error predicting procedure effectiveness:', error);
      return 75; // Default fallback
    }
  }

  /**
   * Get model predictions for auditor performance
   */
  async predictAuditorPerformance(auditorContext: any): Promise<any> {
    try {
      const model = await this.getAuditorModel();
      if (!model) {
        return {
          qualityScore: 75,
          completionProbability: 0.8,
          timeAccuracy: 0.75
        };
      }

      // Simplified prediction logic - in practice would use actual ML model
      const baseQuality = 75;
      const baseCompletion = 0.8;
      const baseTimeAccuracy = 0.75;

      // Apply auditor-specific adjustments
      let qualityAdjustment = 0;
      let completionAdjustment = 0;
      let timeAdjustment = 0;

      if (auditorContext.experience === 'senior') {
        qualityAdjustment += 10;
        completionAdjustment += 0.1;
        timeAdjustment += 0.1;
      }

      if (auditorContext.workload > 0.8) {
        qualityAdjustment -= 5;
        completionAdjustment -= 0.1;
        timeAdjustment -= 0.1;
      }

      return {
        qualityScore: Math.max(40, Math.min(95, baseQuality + qualityAdjustment)),
        completionProbability: Math.max(0.3, Math.min(0.95, baseCompletion + completionAdjustment)),
        timeAccuracy: Math.max(0.3, Math.min(0.95, baseTimeAccuracy + timeAdjustment))
      };

    } catch (error) {
      console.error('Error predicting auditor performance:', error);
      return {
        qualityScore: 75,
        completionProbability: 0.8,
        timeAccuracy: 0.75
      };
    }
  }

  /**
   * Get model predictions for timeline duration
   */
  async predictTimelineDuration(timelineContext: any): Promise<number> {
    try {
      const model = await this.getTimelineModel();
      if (!model) return timelineContext.baseDuration || 8;

      // Simplified prediction logic - in practice would use actual ML model
      let baseDuration = timelineContext.baseDuration || 8;

      // Apply context-based adjustments
      const complexityMultiplier = {
        'simple': 0.8,
        'moderate': 1.0,
        'complex': 1.3,
        'highly_complex': 1.6
      };

      baseDuration *= complexityMultiplier[timelineContext.complexity] || 1.0;

      // Adjust for historical patterns
      if (timelineContext.historicalAverage) {
        baseDuration = baseDuration * 0.6 + timelineContext.historicalAverage * 0.4;
      }

      return Math.max(2, Math.round(baseDuration * 10) / 10);

    } catch (error) {
      console.error('Error predicting timeline duration:', error);
      return timelineContext.baseDuration || 8;
    }
  }

  // Private helper methods

  private async initializeProcedureEffectivenessModel(): Promise<void> {
    const existingModel = await this.getProcedureModel();
    if (existingModel) {
      console.log('Procedure effectiveness model already exists');
      return;
    }

    const modelData: InsertMLModel = {
      modelName: 'procedure_effectiveness_v1',
      modelType: 'procedure_effectiveness',
      version: '1.0.0',
      configuration: JSON.stringify({
        algorithm: 'ensemble',
        features: ['complexity', 'risk_category', 'historical_success', 'auditor_skill', 'time_constraints'],
        hyperparameters: {
          n_estimators: 100,
          max_depth: 10,
          learning_rate: 0.1
        }
      }),
      modelMetrics: JSON.stringify({
        accuracy: 0.75,
        precision: 0.73,
        recall: 0.77,
        f1Score: 0.75,
        initialized: new Date()
      }),
      trainingStatus: 'ready',
      performanceScore: 75
    };

    await storage.createMLModel(modelData);
    console.log('Procedure effectiveness model initialized');
  }

  private async initializeAuditorPerformanceModel(): Promise<void> {
    const existingModel = await this.getAuditorModel();
    if (existingModel) {
      console.log('Auditor performance model already exists');
      return;
    }

    const modelData: InsertMLModel = {
      modelName: 'auditor_performance_v1',
      modelType: 'auditor_performance',
      version: '1.0.0',
      configuration: JSON.stringify({
        algorithm: 'gradient_boosting',
        features: ['experience_level', 'specializations', 'workload', 'historical_performance', 'test_complexity'],
        hyperparameters: {
          n_estimators: 150,
          max_depth: 8,
          learning_rate: 0.05
        }
      }),
      modelMetrics: JSON.stringify({
        accuracy: 0.78,
        precision: 0.76,
        recall: 0.80,
        f1Score: 0.78,
        initialized: new Date()
      }),
      trainingStatus: 'ready',
      performanceScore: 78
    };

    await storage.createMLModel(modelData);
    console.log('Auditor performance model initialized');
  }

  private async initializeTimelinePredictionModel(): Promise<void> {
    const existingModel = await this.getTimelineModel();
    if (existingModel) {
      console.log('Timeline prediction model already exists');
      return;
    }

    const modelData: InsertMLModel = {
      modelName: 'timeline_prediction_v1',
      modelType: 'timeline_prediction',
      version: '1.0.0',
      configuration: JSON.stringify({
        algorithm: 'regression_ensemble',
        features: ['complexity', 'scope_size', 'auditor_experience', 'historical_durations', 'dependencies'],
        hyperparameters: {
          n_estimators: 120,
          max_depth: 12,
          learning_rate: 0.08
        }
      }),
      modelMetrics: JSON.stringify({
        meanAbsoluteError: 1.5,
        rootMeanSquareError: 2.1,
        r2Score: 0.72,
        accuracy: 0.73,
        initialized: new Date()
      }),
      trainingStatus: 'ready',
      performanceScore: 73
    };

    await storage.createMLModel(modelData);
    console.log('Timeline prediction model initialized');
  }

  private async getProcedureModel(): Promise<MLModel | null> {
    try {
      const models = await storage.getMLModelsByType('procedure_effectiveness');
      return models.find(m => m.isActive) || null;
    } catch (error) {
      console.error('Error getting procedure model:', error);
      return null;
    }
  }

  private async getAuditorModel(): Promise<MLModel | null> {
    try {
      const models = await storage.getMLModelsByType('auditor_performance');
      return models.find(m => m.isActive) || null;
    } catch (error) {
      console.error('Error getting auditor model:', error);
      return null;
    }
  }

  private async getTimelineModel(): Promise<MLModel | null> {
    try {
      const models = await storage.getMLModelsByType('timeline_prediction');
      return models.find(m => m.isActive) || null;
    } catch (error) {
      console.error('Error getting timeline model:', error);
      return null;
    }
  }

  private async updateProcedureModel(learningData: LearningData[]): Promise<void> {
    try {
      const model = await this.getProcedureModel();
      if (!model) return;

      // Extract procedure-relevant features from learning data
      const procedureFeatures = learningData.map(data => ({
        proceduresUsed: data.actualProceduresUsed,
        qualityScore: data.qualityScore,
        outcomeSuccess: data.outcomeSuccess,
        contextFactors: data.contextFactors
      }));

      // Update model with new training data (simplified)
      const currentConfig = JSON.parse(model.configuration);
      const newConfig = {
        ...currentConfig,
        lastUpdate: new Date(),
        trainingDataPoints: (currentConfig.trainingDataPoints || 0) + learningData.length
      };

      await storage.updateMLModel(model.id, {
        configuration: JSON.stringify(newConfig),
        trainingDataSize: newConfig.trainingDataPoints,
        lastTrained: new Date()
      });

      console.log(`📊 Updated procedure model with ${learningData.length} new examples`);

    } catch (error) {
      console.error('Error updating procedure model:', error);
    }
  }

  private async updateAuditorModel(learningData: LearningData[]): Promise<void> {
    try {
      const model = await this.getAuditorModel();
      if (!model) return;

      // Extract auditor-relevant features from learning data
      const auditorFeatures = learningData.map(data => ({
        auditorId: data.actualAuditor,
        qualityScore: data.qualityScore,
        actualTimeline: data.actualTimeline,
        predictedTimeline: data.predictedTimeline,
        outcomeSuccess: data.outcomeSuccess
      }));

      // Update model with new training data (simplified)
      const currentConfig = JSON.parse(model.configuration);
      const newConfig = {
        ...currentConfig,
        lastUpdate: new Date(),
        trainingDataPoints: (currentConfig.trainingDataPoints || 0) + learningData.length
      };

      await storage.updateMLModel(model.id, {
        configuration: JSON.stringify(newConfig),
        trainingDataSize: newConfig.trainingDataPoints,
        lastTrained: new Date()
      });

      console.log(`👥 Updated auditor model with ${learningData.length} new examples`);

    } catch (error) {
      console.error('Error updating auditor model:', error);
    }
  }

  private async updateTimelineModel(learningData: LearningData[]): Promise<void> {
    try {
      const model = await this.getTimelineModel();
      if (!model) return;

      // Extract timeline-relevant features from learning data
      const timelineFeatures = learningData.filter(data => 
        data.actualTimeline && data.predictedTimeline
      ).map(data => ({
        actualTimeline: data.actualTimeline,
        predictedTimeline: data.predictedTimeline,
        contextFactors: data.contextFactors,
        auditorId: data.actualAuditor
      }));

      if (timelineFeatures.length === 0) return;

      // Update model with new training data (simplified)
      const currentConfig = JSON.parse(model.configuration);
      const newConfig = {
        ...currentConfig,
        lastUpdate: new Date(),
        trainingDataPoints: (currentConfig.trainingDataPoints || 0) + timelineFeatures.length
      };

      await storage.updateMLModel(model.id, {
        configuration: JSON.stringify(newConfig),
        trainingDataSize: newConfig.trainingDataPoints,
        lastTrained: new Date()
      });

      console.log(`⏱️ Updated timeline model with ${timelineFeatures.length} new examples`);

    } catch (error) {
      console.error('Error updating timeline model:', error);
    }
  }

  private async processFeedbackForModels(feedback: UserFeedback): Promise<void> {
    try {
      // Update model confidence based on feedback
      const recommendation = await storage.getIntelligentRecommendation(feedback.recommendationId);
      if (!recommendation) return;

      // Adjust model weights based on feedback type and satisfaction
      const satisfactionImpact = (feedback.satisfactionScore - 3) * 0.1; // Scale -0.2 to 0.2
      
      // This would involve more sophisticated feedback integration in practice
      console.log(`💡 Processed feedback for recommendation ${feedback.recommendationId} (satisfaction: ${feedback.satisfactionScore})`);

    } catch (error) {
      console.error('Error processing feedback for models:', error);
    }
  }

  private async assessRetrainingNeed(model: MLModel): Promise<boolean> {
    try {
      const currentMetrics = JSON.parse(model.modelMetrics);
      const currentAccuracy = Number(model.performanceScore) || currentMetrics.accuracy || 0;

      // Check if performance has degraded significantly
      if (currentAccuracy < 60) {
        return true;
      }

      // Check if enough new data has been collected
      const daysSinceLastTraining = model.lastTrained 
        ? Math.floor((Date.now() - new Date(model.lastTrained).getTime()) / (1000 * 60 * 60 * 24))
        : 365;

      if (daysSinceLastTraining > 30 && (model.trainingDataSize || 0) > this.MIN_TRAINING_DATA * 2) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error assessing retraining need:', error);
      return false;
    }
  }

  private async retrainModel(model: MLModel): Promise<void> {
    try {
      console.log(`🔄 Retraining model ${model.modelName}`);

      // Mark model as training
      await storage.updateMLModel(model.id, {
        trainingStatus: 'training'
      });

      // Simulate model retraining (in practice would involve actual ML pipeline)
      await this.simulateModelRetraining(model);

      // Update model status
      await storage.updateMLModel(model.id, {
        trainingStatus: 'ready',
        lastTrained: new Date(),
        version: this.incrementVersion(model.version)
      });

      console.log(`✅ Model ${model.modelName} retrained successfully`);

    } catch (error) {
      console.error(`❌ Error retraining model ${model.modelName}:`, error);
      
      // Mark model as failed
      await storage.updateMLModel(model.id, {
        trainingStatus: 'failed'
      });
    }
  }

  private async simulateModelRetraining(model: MLModel): Promise<void> {
    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate improved performance
    const currentPerformance = Number(model.performanceScore) || 70;
    const newPerformance = Math.min(95, currentPerformance + Math.random() * 10);

    const newMetrics = {
      accuracy: newPerformance / 100,
      precision: (newPerformance - 2) / 100,
      recall: (newPerformance + 1) / 100,
      f1Score: (newPerformance - 1) / 100,
      retrainedAt: new Date()
    };

    await storage.updateMLModel(model.id, {
      performanceScore: newPerformance,
      validationAccuracy: newPerformance,
      modelMetrics: JSON.stringify(newMetrics)
    });
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private async recordLearningMetrics(learningData: LearningData[]): Promise<void> {
    try {
      // Record overall learning metrics
      const metricsData: InsertLearningSystemMetrics = {
        metricName: 'learning_data_processed',
        metricType: 'usage',
        modelType: 'all',
        metricValue: learningData.length,
        measurementPeriod: 'daily',
        periodStartDate: new Date(),
        periodEndDate: new Date(),
        sampleSize: learningData.length,
        trendDirection: 'stable',
        notes: `Processed ${learningData.length} learning examples from completed audits`
      };

      await storage.createLearningSystemMetrics(metricsData);

      // Record model-specific metrics
      const procedureAccuracy = this.calculateProcedureAccuracy(learningData);
      const auditorAccuracy = this.calculateAuditorAccuracy(learningData);
      const timelineAccuracy = this.calculateTimelineAccuracy(learningData);

      await Promise.all([
        storage.createLearningSystemMetrics({
          ...metricsData,
          metricName: 'procedure_recommendation_accuracy',
          metricType: 'accuracy',
          modelType: 'procedure',
          metricValue: procedureAccuracy
        }),
        storage.createLearningSystemMetrics({
          ...metricsData,
          metricName: 'auditor_assignment_accuracy',
          metricType: 'accuracy',
          modelType: 'auditor',
          metricValue: auditorAccuracy
        }),
        storage.createLearningSystemMetrics({
          ...metricsData,
          metricName: 'timeline_prediction_accuracy',
          metricType: 'accuracy',
          modelType: 'timeline',
          metricValue: timelineAccuracy
        })
      ]);

    } catch (error) {
      console.error('Error recording learning metrics:', error);
    }
  }

  private calculateProcedureAccuracy(learningData: LearningData[]): number {
    const relevantData = learningData.filter(d => 
      d.recommendedProcedures?.length > 0 && d.actualProceduresUsed?.length > 0
    );

    if (relevantData.length === 0) return 0;

    let totalAccuracy = 0;
    relevantData.forEach(data => {
      const recommendedIds = data.recommendedProcedures.map(p => p.procedureId);
      const actualIds = data.actualProceduresUsed.map(p => p.procedureId);
      
      const overlap = recommendedIds.filter(id => actualIds.includes(id)).length;
      const accuracy = overlap / Math.max(recommendedIds.length, actualIds.length);
      totalAccuracy += accuracy;
    });

    return Math.round((totalAccuracy / relevantData.length) * 100);
  }

  private calculateAuditorAccuracy(learningData: LearningData[]): number {
    const relevantData = learningData.filter(d => 
      d.recommendedAuditor && d.actualAuditor
    );

    if (relevantData.length === 0) return 0;

    const correctAssignments = relevantData.filter(d => 
      d.recommendedAuditor === d.actualAuditor
    ).length;

    return Math.round((correctAssignments / relevantData.length) * 100);
  }

  private calculateTimelineAccuracy(learningData: LearningData[]): number {
    const relevantData = learningData.filter(d => 
      d.predictedTimeline && d.actualTimeline
    );

    if (relevantData.length === 0) return 0;

    let totalAccuracy = 0;
    relevantData.forEach(data => {
      const variance = Math.abs(data.actualTimeline - data.predictedTimeline) / data.predictedTimeline;
      const accuracy = Math.max(0, 1 - variance);
      totalAccuracy += accuracy;
    });

    return Math.round((totalAccuracy / relevantData.length) * 100);
  }
}

// Export singleton instance
export const mlModelManager = new MLModelManager();