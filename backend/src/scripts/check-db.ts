import { db } from "../config/firebase";

async function check() {
  const snap = await db.collection("potholes").get();
  console.log(`Total potholes in DB: ${snap.size}`);
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.id}: ${data.road} (${data.status}), reportedAt: ${data.reportedAt}`);
  });
}

check();
