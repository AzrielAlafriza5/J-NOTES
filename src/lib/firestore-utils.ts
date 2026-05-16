import { doc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const errorMessage = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorMessage);
  throw new Error(errorMessage);
}

export async function testConnection() {
  try {
    // Attempt to fetch a non-existent document to test connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firebase connection test successful.");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('reach Cloud Firestore backend'))) {
      console.error("Firebase connectivity issue detected. Please check your network and configuration.");
    } else {
      console.warn("Firebase connection test warning (expected if doc not found or permission denied, but confirms reachable):", error);
    }
  }
}
