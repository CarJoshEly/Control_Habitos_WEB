import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { auth } from '../firebase'

export const loginWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password)
}

export const registerWithEmail = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password)
}

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export const logout = () => {
  return signOut(auth)
}

export const resetPassword = (email) => {
  return sendPasswordResetEmail(auth, email)
}

export const getToken = async () => {
  const user = auth.currentUser
  if (!user) return null
  return await user.getIdToken()
}