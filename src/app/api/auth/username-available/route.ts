import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { sanitizeUsername, usernameRegex } from '@/lib/profiles';

type Payload = {
  username?: string;
  currentUid?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const username = sanitizeUsername(payload.username ?? '');
  const currentUid = (payload.currentUid ?? '').trim();

  if (!usernameRegex.test(username)) {
    return NextResponse.json({ error: 'Invalid username format.' }, { status: 400 });
  }

  try {
    const snapshot = await adminDb
      .collection('profiles')
      .where('usernameLower', '==', username.toLowerCase())
      .limit(10)
      .get();

    const available = snapshot.empty
      ? true
      : snapshot.docs.every((docSnapshot) => docSnapshot.id === currentUid);

    return NextResponse.json({ available }, { status: 200 });
  } catch (error) {
    console.error('Failed to check username availability', error);
    return NextResponse.json({ error: 'Unable to check username right now.' }, { status: 500 });
  }
}
