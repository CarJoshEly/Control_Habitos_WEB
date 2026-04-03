import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Primero setear el usuario para que el ProtectedRoute no redirija
      setUser(currentUser)
      setLoading(false)

      // Luego guardar en Firestore en segundo plano
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            displayName: currentUser.displayName || '',
            email: currentUser.email,
            photoUrl: currentUser.photoURL || '',
            createdAt: new Date(),
            lastLogin: new Date(),
            notificationsEnabled: true,
          })
        } else {
          await setDoc(userRef, { lastLogin: new Date() }, { merge: true })
        }
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)