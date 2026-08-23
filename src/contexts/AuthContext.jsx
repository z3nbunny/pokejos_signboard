import { useEffect, useState } from 'react';
import {
    getAuth,
    onAuthStateChanged
} from 'firebase/auth';
import {
    doc,
    getDoc
} from 'firebase/firestore';

import { app, db } from '../firebase';
import { AuthContext } from './authContextValue';

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] =
        useState(null);

    const [userData, setUserData] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {
        const auth = getAuth(app);

        const unsubscribe = onAuthStateChanged(
            auth,
            async (user) => {
                setLoading(true);
                setCurrentUser(user);
                setUserData(null);

                // Signed-out browsers have no Firebase identity.
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Anonymous accounts belong to TVs, not
                // administrators. They do not have documents
                // in the users collection.
                if (user.isAnonymous) {
                    setLoading(false);
                    return;
                }

                try {
                    const userRef = doc(
                        db,
                        'users',
                        user.uid
                    );

                    const userSnapshot =
                        await getDoc(userRef);

                    if (userSnapshot.exists()) {
                        setUserData(
                            userSnapshot.data()
                        );
                    } else {
                        console.warn(
                            'Authenticated Google user has '
                            + 'no administrator profile.'
                        );
                    }
                } catch (error) {
                    console.error(
                        'Unable to load administrator profile:',
                        error
                    );
                } finally {
                    setLoading(false);
                }
            }
        );

        return () => unsubscribe();
    }, []);

    const isDeviceUser =
        currentUser?.isAnonymous === true;

    const isAuthorizedAdmin =
        userData?.role === 'super_admin'
        || userData?.role === 'location_admin';

    const value = {
        currentUser,
        userData,
        loading,
        isDeviceUser,
        isAuthorizedAdmin
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}