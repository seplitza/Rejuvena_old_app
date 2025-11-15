/**
 * Auth Sagas
 * Side effects for authentication
 */

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { request, endpoints, AuthTokenManager } from '@/api';
import {
  loginWithEmail,
  signupWithEmail,
  sendResetPasswordRequest,
  signInWithGoogle,
  signInWithFacebook,
  guestUserLogin,
  setAuthToken,
  setUser,
  setLoading,
  setError,
} from './slice';

interface LoginPayload {
  email: string;
  password: string;
}

interface SignupPayload {
  email: string;
  firstName: string;
  lastName: string;
}

interface ResetPasswordPayload {
  email: string;
}

function* loginWithEmailSaga(action: PayloadAction<LoginPayload>): Generator<any, void, any> {
  try {
    yield put(setLoading(true));
    yield put(setError(null));
    
    const { email, password } = action.payload;
    const response: any = yield call(request.post, endpoints.login, {
      username: email,
      password,
      grant_type: 'password',
    });

    yield put(setAuthToken(response.access_token));
    AuthTokenManager.set(response.access_token);
    
    // Fetch user profile after login
    const userProfile: any = yield call(request.get, endpoints.get_user_profile);
    yield put(setUser(userProfile));
    
    // Redirect to dashboard (handled in component)
  } catch (error: any) {
    yield put(setError(error.message || 'Login failed'));
  } finally {
    yield put(setLoading(false));
  }
}

function* signupWithEmailSaga(action: PayloadAction<SignupPayload>): Generator<any, void, any> {
  try {
    yield put(setLoading(true));
    yield put(setError(null));
    
    const { email, firstName, lastName } = action.payload;
    yield call(request.post, endpoints.register, {
      email,
      firstName,
      lastName,
      termCondtion: true,
    });
    
    // Success - redirect to login handled in component
  } catch (error: any) {
    yield put(setError(error.message || 'Signup failed'));
  } finally {
    yield put(setLoading(false));
  }
}

function* sendResetPasswordRequestSaga(action: PayloadAction<ResetPasswordPayload>): Generator<any, void, any> {
  try {
    yield put(setLoading(true));
    yield put(setError(null));
    
    const { email } = action.payload;
    yield call(request.get, endpoints.reset_password, {
      params: { Email: email },
    });
    
    // Success - handled in component
  } catch (error: any) {
    yield put(setError(error.message || 'Password reset failed'));
  } finally {
    yield put(setLoading(false));
  }
}

function* signInWithGoogleSaga(): Generator<any, void, any> {
  try {
    yield put(setLoading(true));
    yield put(setError(null));
    
    // Web implementation will use Google OAuth 2.0 flow
    // This needs to be implemented with google-auth-library or next-auth
    console.log('Google sign-in for web needs implementation');
    
  } catch (error: any) {
    yield put(setError(error.message || 'Google sign-in failed'));
  } finally {
    yield put(setLoading(false));
  }
}

function* signInWithFacebookSaga(): Generator<any, void, any> {
  try {
    yield put(setLoading(true));
    yield put(setError(null));
    
    // Web implementation will use Facebook SDK
    // This needs to be implemented with Facebook JavaScript SDK
    console.log('Facebook sign-in for web needs implementation');
    
  } catch (error: any) {
    yield put(setError(error.message || 'Facebook sign-in failed'));
  } finally {
    yield put(setLoading(false));
  }
}

function* guestUserLoginSaga(): Generator<any, void, any> {
  try {
    yield put(setLoading(true));
    yield put(setError(null));
    
    // Generate a device ID for web (use browser fingerprinting or UUID)
    const deviceId = typeof window !== 'undefined' 
      ? localStorage.getItem('deviceId') || crypto.randomUUID()
      : 'unknown';
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('deviceId', deviceId);
    }
    
    const response: any = yield call(request.get, endpoints.guest_user_login, {
      params: { deviceId },
    });

    yield put(setAuthToken(response.access_token));
    AuthTokenManager.set(response.access_token);
    
  } catch (error: any) {
    yield put(setError(error.message || 'Guest login failed'));
  } finally {
    yield put(setLoading(false));
  }
}

// Watchers
export function* authSagas() {
  yield all([
    takeLatest(loginWithEmail.type, loginWithEmailSaga),
    takeLatest(signupWithEmail.type, signupWithEmailSaga),
    takeLatest(sendResetPasswordRequest.type, sendResetPasswordRequestSaga),
    takeLatest(signInWithGoogle.type, signInWithGoogleSaga),
    takeLatest(signInWithFacebook.type, signInWithFacebookSaga),
    takeLatest(guestUserLogin.type, guestUserLoginSaga),
  ]);
}
