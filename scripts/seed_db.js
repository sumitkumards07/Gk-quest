const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// INSTRUCTIONS: 
// 1. Visit: Firebase Console -> Project Settings -> Service Accounts
// 2. Generate new private key -> Save as 'serviceAccount.json' in this folder
// 3. Run: npm install firebase-admin
// 4. Run: node scripts/seed_db.js

try {
  const serviceAccount = require('./serviceAccount.json');
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (e) {
  console.error("🛑 ERROR: 'serviceAccount.json' not found in scripts/ folder.");
  console.log("Please generate a service account key from the Firebase Console.");
  process.exit(1);
}

const db = getFirestore();

const initialQuestions = [
  // Science
  { question: "What is the boiling point of water at sea level?", optionA: "90°C", optionB: "100°C", optionC: "110°C", optionD: "120°C", correctAnswer: "B", category: "Science" },
  { question: "Which planet is known as the Red Planet?", optionA: "Venus", optionB: "Jupiter", optionC: "Mars", optionD: "Saturn", correctAnswer: "C", category: "Science" },
  // History
  { question: "Who was the first Prime Minister of India?", optionA: "Mahatma Gandhi", optionB: "Sardar Patel", optionC: "Jawaharlal Nehru", optionD: "Dr. B.R. Ambedkar", correctAnswer: "C", category: "History" },
  { question: "In which year did World War II end?", optionA: "1940", optionB: "1945", optionC: "1950", optionD: "1939", correctAnswer: "B", category: "History" },
  // Arts
  { question: "Who painted the Mona Lisa?", optionA: "Pablo Picasso", optionB: "Vincent van Gogh", optionC: "Leonardo da Vinci", optionD: "Claude Monet", correctAnswer: "C", category: "Arts" },
  { question: "Which city is famous for its 'Lucknowi Chikan' embroidery?", optionA: "Delhi", optionB: "Lucknow", optionC: "Mumbai", optionD: "Jaipur", correctAnswer: "B", category: "Arts" }
];

const globalSettings = {
  secondsPerQuestion: 15,
  correctAnswerPoints: 10,
  maintenanceMode: false
};

async function seedDatabase() {
  console.log("🚀 Initializing Kinetic Scholar Database...");

  // 1. Seed Global Settings
  await db.collection('settings').doc('global').set(globalSettings);
  console.log("✅ Global settings initialized.");

  // 2. Seed Initial Questions
  const batch = db.batch();
  initialQuestions.forEach(q => {
    const qRef = db.collection('questions').doc();
    batch.set(qRef, q);
  });
  
  await batch.commit();
  console.log(`✅ Seeded ${initialQuestions.length} academic questions.`);

  console.log("🎓 Kinetic Scholar database creation complete!");
}

seedDatabase().catch(console.error);
