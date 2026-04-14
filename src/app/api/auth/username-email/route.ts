import { NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase-admin';
import { sanitizeUsername, usernameRegex } from '@/lib/profiles';
import type { UserProfile } from '@/types/user';

type Payload = {
  username?: string;
};

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const username = sanitizeUsername(payload.username ?? '');
  if (!usernameRegex.test(username)) {
    return NextResponse.json({ error: 'Invalid username format.' }, { status: 400 });
  }

  try {
    const snapshot = await adminDb
      .collection('profiles')
      .where('usernameLower', '==', username.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'No account found for that username.' }, { status: 404 });
    }

    const profile = snapshot.docs[0].data() as UserProfile;
    if (!profile.email) {
      return NextResponse.json({ error: 'That account cannot be signed in with password.' }, { status: 409 });
    }

    return NextResponse.json({ email: profile.email.toLowerCase() }, { status: 200 });
  } catch (error) {
    console.error('Failed to resolve username to email', error);
    return NextResponse.json({ error: 'Unable to resolve username right now.' }, { status: 500 });
  }
}
