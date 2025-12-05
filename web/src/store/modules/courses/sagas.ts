/**
 * Courses Sagas
 * Side effects for courses API calls
 */

import { call, put, takeLatest, select } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { request, endpoints } from '../../../api';
import {
  fetchMyOrders,
  fetchAvailableCourses,
  fetchDemoCourses,
  fetchCourseDetails,
  fetchCoursePlans,
  fetchMarathon,
  createOrder as createOrderAction,
  purchaseCourse as purchaseCourseAction,
  acceptCourseRules as acceptCourseRulesAction,
  setMyOrders,
  setLoadingOrders,
  setOrdersError,
  setAvailableCourses,
  setDemoCourses,
  setLoadingCourses,
  setCoursesError,
  setSelectedCourse,
  setCoursePlans,
  setLoadingDetails,
  setDetailsError,
  setMarathon,
  setLoadingMarathon,
  setMarathonError,
} from './slice';

// Helper to get timezone offset
const getTimeZoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

/**
 * Fetch user's orders (active courses)
 */
function* fetchMyOrdersSaga(): Generator<any, void, any> {
  try {
    yield put(setLoadingOrders(true));
    const timeZoneOffSet = getTimeZoneOffset();
    
    const response = yield call(
      request.get,
      endpoints.get_order_list,
      { params: { timeZoneOffSet } }
    );

    console.log('🔍 SAGA fetchMyOrdersSaga response:', response);
    console.log('🔍 SAGA response.currentCourses:', response.currentCourses);
    console.log('🔍 SAGA response.currentCourses length:', response.currentCourses?.length);

    // API returns { currentCourses, availableCourses, archives }
    const orders = response.currentCourses || [];
    console.log('🔍 SAGA setting myOrders:', orders);
    yield put(setMyOrders(orders));
  } catch (error: any) {
    console.error('❌ SAGA Failed to fetch orders:', error);
    yield put(setOrdersError(error.message || 'Failed to load orders'));
  }
}

/**
 * Fetch available courses for all users
 */
function* fetchAvailableCoursesSaga(): Generator<any, void, any> {
  try {
    yield put(setLoadingCourses(true));
    
    const response = yield call(
      request.get,
      endpoints.get_order_list,
      { params: { timeZoneOffSet: getTimeZoneOffset() } }
    );

    // API returns { currentCourses, availableCourses, archives }
    yield put(setAvailableCourses(response.availableCourses || []));
  } catch (error: any) {
    console.error('Failed to fetch available courses:', error);
    yield put(setCoursesError(error.message || 'Failed to load courses'));
  }
}

/**
 * Fetch demo courses
 */
function* fetchDemoCoursesSaga(): Generator<any, void, any> {
  try {
    yield put(setLoadingCourses(true));
    
    const response = yield call(
      request.get,
      endpoints.get_demo_course_list
    );

    yield put(setDemoCourses(response.courses || []));
  } catch (error: any) {
    console.error('Failed to fetch demo courses:', error);
    yield put(setCoursesError(error.message || 'Failed to load demo courses'));
  }
}

/**
 * Fetch course details (ExtensionDescription)
 */
function* fetchCourseDetailsSaga(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    yield put(setLoadingDetails(true));
    const marathonId = action.payload;
    
    const response = yield call(
      request.get,
      endpoints.get_course_detail,
      { params: { marathonid: marathonId } }
    );

    yield put(setSelectedCourse(response));
  } catch (error: any) {
    console.error('Failed to fetch course details:', error);
    yield put(setDetailsError(error.message || 'Failed to load course details'));
  }
}

/**
 * Fetch course plans (pricing tiers)
 */
function* fetchCoursePlansSaga(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const courseId = action.payload;
    
    const response = yield call(
      request.get,
      endpoints.get_course_plan,
      { params: { courseId } }
    );

    yield put(setCoursePlans(response.plans || []));
  } catch (error: any) {
    console.error('Failed to fetch course plans:', error);
    yield put(setDetailsError(error.message || 'Failed to load pricing plans'));
  }
}

/**
 * Fetch marathon data with progress
 */
function* fetchMarathonSaga(action: PayloadAction<{ marathonId: string; timeZoneOffset: number }>): Generator<any, void, any> {
  try {
    yield put(setLoadingMarathon(true));
    const { marathonId, timeZoneOffset } = action.payload;
    
    const response = yield call(
      request.get,
      endpoints.get_start_marathon,
      { params: { marathonId, timeZoneOffset } }
    );

    yield put(setMarathon({ id: marathonId, data: response }));
  } catch (error: any) {
    console.error('Failed to fetch marathon:', error);
    yield put(setMarathonError(error.message || 'Failed to load marathon data'));
  }
}

/**
 * Create order for a course
 */
function* createOrderSaga(action: PayloadAction<string>): Generator<any, any, any> {
  try {
    const marathonId = action.payload;
    
    const response = yield call(
      request.get,
      endpoints.create_order,
      { params: { marathonId } }
    );

    console.log('Order created:', response);
    // TODO: Navigate to payment or activate free course
    return response;
  } catch (error: any) {
    console.error('Failed to create order:', error);
    yield put(setOrdersError(error.message || 'Failed to create order'));
  }
}

/**
 * Purchase/activate course (for free courses with coupon)
 */
function* purchaseCourseSaga(action: PayloadAction<{ orderNumber: string; couponCode: string | null }>): Generator<any, any, any> {
  try {
    const { orderNumber, couponCode } = action.payload;
    const timeZoneOffset = getTimeZoneOffset();
    
    const response = yield call(
      request.get,
      endpoints.purchase_marathon_by_coupon,
      { params: { orderNumber, couponCode, timeZoneOffset } }
    );

    console.log('Course purchased:', response);
    
    // Refresh orders list
    yield put(fetchMyOrders());
    
    return response;
  } catch (error: any) {
    console.error('Failed to purchase course:', error);
    yield put(setOrdersError(error.message || 'Failed to activate course'));
  }
}

/**
 * Accept course rules/terms
 */
function* acceptCourseRulesSaga(action: PayloadAction<{ courseId: string; status: boolean }>): Generator<any, any, any> {
  try {
    const { courseId, status } = action.payload;
    
    const response = yield call(
      request.get,
      endpoints.accept_marathon_terms,
      { params: { status, courseId } }
    );

    console.log('Course rules accepted:', response);
    return response;
  } catch (error: any) {
    console.error('Failed to accept course rules:', error);
    yield put(setMarathonError(error.message || 'Failed to accept terms'));
  }
}

/**
 * Root saga
 */
export function* coursesSaga() {
  yield takeLatest(fetchMyOrders.type, fetchMyOrdersSaga);
  yield takeLatest(fetchAvailableCourses.type, fetchAvailableCoursesSaga);
  yield takeLatest(fetchDemoCourses.type, fetchDemoCoursesSaga);
  yield takeLatest(fetchCourseDetails.type, fetchCourseDetailsSaga);
  yield takeLatest(fetchCoursePlans.type, fetchCoursePlansSaga);
  yield takeLatest(fetchMarathon.type, fetchMarathonSaga);
  yield takeLatest(createOrderAction.type, createOrderSaga);
  yield takeLatest(purchaseCourseAction.type, purchaseCourseSaga);
  yield takeLatest(acceptCourseRulesAction.type, acceptCourseRulesSaga);
}
