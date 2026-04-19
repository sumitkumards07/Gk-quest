import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyDn34CUWbpQywTvcHqAO6yR-OgTVDel0O0",
  projectId: "gk-quest-with-rewards"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
getDocs(collection(db, "users")).then(snap => {
  console.log("Found:", snap.size);
  console.log("First:", snap.docs[0]?.data());
  process.exit(0);
});
