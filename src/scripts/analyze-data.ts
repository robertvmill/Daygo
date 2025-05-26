import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export async function analyzeFirebaseData() {
  try {
    console.log('🔍 Analyzing Firebase Data Schema...\n');

    // Analyze templates collection
    console.log('📋 TEMPLATES COLLECTION ANALYSIS:');
    console.log('================================');
    
    const templatesSnapshot = await getDocs(query(collection(db, 'templates'), limit(10)));
    
    if (templatesSnapshot.empty) {
      console.log('No templates found in database');
    } else {
      const templatesByUser: Record<string, number> = {};
      const fieldTypes: Set<string> = new Set();
      
      templatesSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Count templates per user
        templatesByUser[data.userId] = (templatesByUser[data.userId] || 0) + 1;
        
        // Collect field types
        if (data.fields && Array.isArray(data.fields)) {
          data.fields.forEach((field: any) => {
            if (field.type) {
              fieldTypes.add(field.type);
            }
          });
        }
        
        console.log(`Template: ${data.name}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  User: ${data.userId}`);
        console.log(`  Description: ${data.description}`);
        console.log(`  Fields: ${data.fields?.length || 0} fields`);
        console.log(`  Created: ${data.createdAt?.toDate?.()}`);
        console.log('---');
      });
      
      console.log('\nTemplate Statistics:');
      console.log(`Total templates analyzed: ${templatesSnapshot.size}`);
      console.log(`Field types found: ${Array.from(fieldTypes).join(', ')}`);
      console.log(`Templates per user:`, templatesByUser);
    }

    // Analyze journal entries collection
    console.log('\n📝 JOURNAL ENTRIES COLLECTION ANALYSIS:');
    console.log('=====================================');
    
    const journalSnapshot = await getDocs(query(collection(db, 'journalEntries'), limit(10)));
    
    if (journalSnapshot.empty) {
      console.log('No journal entries found in database');
    } else {
      const entriesByUser: Record<string, number> = {};
      const entriesWithTemplate: number = 0;
      const entriesWithoutTemplate: number = 0;
      const templateUsage: Record<string, number> = {};
      
      journalSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Count entries per user
        entriesByUser[data.userId] = (entriesByUser[data.userId] || 0) + 1;
        
        // Count template usage
        if (data.templateId) {
          templateUsage[data.templateId] = (templateUsage[data.templateId] || 0) + 1;
        }
        
        console.log(`Entry: ${data.title}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  User: ${data.userId}`);
        console.log(`  Template ID: ${data.templateId || 'None'}`);
        console.log(`  Has Template Fields: ${data.templateFields ? 'Yes' : 'No'}`);
        console.log(`  Content length: ${data.content?.length || 0} chars`);
        console.log(`  Created: ${data.createdAt?.toDate?.()}`);
        console.log('---');
      });
      
      console.log('\nJournal Entry Statistics:');
      console.log(`Total entries analyzed: ${journalSnapshot.size}`);
      console.log(`Entries per user:`, entriesByUser);
      console.log(`Template usage:`, templateUsage);
      console.log(`Entries with templates: ${Object.values(templateUsage).reduce((a, b) => a + b, 0)}`);
      console.log(`Entries without templates: ${journalSnapshot.size - Object.values(templateUsage).reduce((a, b) => a + b, 0)}`);
    }

    console.log('\n✅ Data Analysis Complete');
    
    return {
      templatesCount: templatesSnapshot.size,
      journalEntriesCount: journalSnapshot.size,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error analyzing data:', error);
    return {
      templatesCount: 0,
      journalEntriesCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 