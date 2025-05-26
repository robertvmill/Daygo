const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'dayfocus-45a76'
  });
}

const db = admin.firestore();

async function queryCollections() {
  console.log('🔍 Querying Firebase Collections...\n');

  try {
    // Query templates collection
    console.log('📋 TEMPLATES COLLECTION:');
    console.log('========================');
    const templatesSnapshot = await db.collection('templates').limit(5).get();
    
    if (templatesSnapshot.empty) {
      console.log('No templates found');
    } else {
      templatesSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Template ${index + 1}:`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Name: ${data.name}`);
        console.log(`  Description: ${data.description}`);
        console.log(`  User ID: ${data.userId}`);
        console.log(`  Fields: ${JSON.stringify(data.fields, null, 2)}`);
        console.log(`  Created: ${data.createdAt?.toDate()}`);
        console.log('---');
      });
    }

    // Query journal entries collection
    console.log('\n📝 JOURNAL ENTRIES COLLECTION:');
    console.log('==============================');
    const journalSnapshot = await db.collection('journalEntries').limit(5).get();
    
    if (journalSnapshot.empty) {
      console.log('No journal entries found');
    } else {
      journalSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Journal Entry ${index + 1}:`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Title: ${data.title}`);
        console.log(`  User ID: ${data.userId}`);
        console.log(`  Template ID: ${data.templateId || 'None'}`);
        console.log(`  Template Fields: ${JSON.stringify(data.templateFields, null, 2)}`);
        console.log(`  Content: ${data.content?.substring(0, 100)}...`);
        console.log(`  Created: ${data.createdAt?.toDate()}`);
        console.log('---');
      });
    }

    // Get unique template IDs from journal entries for filtering
    console.log('\n🏷️  TEMPLATE USAGE ANALYSIS:');
    console.log('============================');
    const allJournalSnapshot = await db.collection('journalEntries').get();
    const templateUsage = {};
    
    allJournalSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.templateId) {
        templateUsage[data.templateId] = (templateUsage[data.templateId] || 0) + 1;
      } else {
        templateUsage['No Template'] = (templateUsage['No Template'] || 0) + 1;
      }
    });

    console.log('Template usage counts:');
    Object.entries(templateUsage).forEach(([templateId, count]) => {
      console.log(`  ${templateId}: ${count} entries`);
    });

    // Get template names for the IDs
    console.log('\n🔗 TEMPLATE ID TO NAME MAPPING:');
    console.log('==============================');
    const allTemplatesSnapshot = await db.collection('templates').get();
    const templateNames = {};
    
    allTemplatesSnapshot.forEach((doc) => {
      const data = doc.data();
      templateNames[doc.id] = data.name;
    });

    Object.entries(templateNames).forEach(([id, name]) => {
      console.log(`  ${id}: "${name}"`);
    });

  } catch (error) {
    console.error('Error querying collections:', error);
  }
}

queryCollections().then(() => {
  console.log('\n✅ Query completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Query failed:', error);
  process.exit(1);
}); 