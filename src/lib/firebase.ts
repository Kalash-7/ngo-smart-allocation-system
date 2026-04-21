/*
 * UnityNet Firebase Initialization (Demo Mode)
 */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const DEMO_USER = {
  uid: 'demo-volunteer-123',
  displayName: 'Guest Volunteer',
  email: 'guest@unitynet.demo',
  photoURL: 'https://ui-avatars.com/api/?name=Guest+Volunteer&background=000&color=fff'
};
