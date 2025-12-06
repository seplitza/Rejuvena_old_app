/**
 * Courses Slice
 * State management for courses, orders, and marathons
 */

import { createSlice, createAction, PayloadAction } from '@reduxjs/toolkit';

// Types
export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  duration: number;
  isFree: boolean;
  isDemo: boolean;
  category?: string;
  level?: string;
  tags?: string[];
}

export interface Order {
  id: string;
  orderId: string;
  title: string;
  subTitle: string;
  description?: string;
  courseDescription?: string;
  imagePath: string;
  wpMarathonId: string;
  startDate: string;
  endDate: string;
  isPaid: boolean;
  days: number;
  cost: number;
  orderStatus: string;
  isPurchased: boolean;
  isFree: boolean;
  productType: string; // 'Marathon' or 'Course' - Marathon has circular image and mass start, Course has square image and individual start
  courseType?: string;
  validFrom: string | null;
  validTo: string | null;
  languageCulture: string;
  // Legacy fields for backward compatibility
  marathonId?: string;
  marathonName?: string;
  orderDate?: string;
  status?: 'Active' | 'Expired' | 'Cancelled';
  price?: number;
  currency?: string;
  subscriptionType?: 'Free' | 'Paid' | 'Trial';
  expiryDate?: string;
  autoRenewal?: boolean;
}

export interface Marathon {
  marathonId: string;
  title: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  isTermsAccepted: boolean;
  totalDays: number;
  completedDays: number;
  progress: number;
}

export interface CourseDetail {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  price: number;
  currency: string;
  duration: number;
  features: string[];
  testimonials: Array<{
    userName: string;
    userAvatar: string;
    text: string;
    rating: number;
  }>;
  isPurchased: boolean;
}

export interface CoursePlan {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  duration: number;
  androidProductId: string;
  iosProductId: string;
  features: string[];
  isMostPopular: boolean;
  discount: number;
}

interface CoursesState {
  // User's active courses/orders
  myOrders: Order[];
  loadingOrders: boolean;
  ordersError: string | null;

  // Available courses
  availableCourses: Course[];
  demoCourses: Course[];
  loadingCourses: boolean;
  coursesError: string | null;

  // Selected course details
  selectedCourse: CourseDetail | null;
  coursePlans: CoursePlan[];
  loadingDetails: boolean;
  detailsError: string | null;

  // Marathon data
  marathons: Record<string, Marathon>;
  loadingMarathon: boolean;
  marathonError: string | null;
}

const initialState: CoursesState = {
  myOrders: [],
  loadingOrders: false,
  ordersError: null,

  availableCourses: [],
  demoCourses: [],
  loadingCourses: false,
  coursesError: null,

  selectedCourse: null,
  coursePlans: [],
  loadingDetails: false,
  detailsError: null,

  marathons: {},
  loadingMarathon: false,
  marathonError: null,
};

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    // Orders
    setMyOrders(state, action: PayloadAction<Order[]>) {
      state.myOrders = action.payload;
      state.loadingOrders = false;
      state.ordersError = null;
    },
    setLoadingOrders(state, action: PayloadAction<boolean>) {
      state.loadingOrders = action.payload;
    },
    setOrdersError(state, action: PayloadAction<string | null>) {
      state.ordersError = action.payload;
      state.loadingOrders = false;
    },

    // Available Courses
    setAvailableCourses(state, action: PayloadAction<Course[]>) {
      state.availableCourses = action.payload;
      state.loadingCourses = false;
      state.coursesError = null;
    },
    setDemoCourses(state, action: PayloadAction<Course[]>) {
      state.demoCourses = action.payload;
      state.loadingCourses = false;
      state.coursesError = null;
    },
    setLoadingCourses(state, action: PayloadAction<boolean>) {
      state.loadingCourses = action.payload;
    },
    setCoursesError(state, action: PayloadAction<string | null>) {
      state.coursesError = action.payload;
      state.loadingCourses = false;
    },

    // Course Details
    setSelectedCourse(state, action: PayloadAction<CourseDetail | null>) {
      state.selectedCourse = action.payload;
      state.loadingDetails = false;
      state.detailsError = null;
    },
    setCoursePlans(state, action: PayloadAction<CoursePlan[]>) {
      state.coursePlans = action.payload;
    },
    setLoadingDetails(state, action: PayloadAction<boolean>) {
      state.loadingDetails = action.payload;
    },
    setDetailsError(state, action: PayloadAction<string | null>) {
      state.detailsError = action.payload;
      state.loadingDetails = false;
    },

    // Marathon
    setMarathon(state, action: PayloadAction<{ id: string; data: Marathon }>) {
      state.marathons[action.payload.id] = action.payload.data;
      state.loadingMarathon = false;
      state.marathonError = null;
    },
    setLoadingMarathon(state, action: PayloadAction<boolean>) {
      state.loadingMarathon = action.payload;
    },
    setMarathonError(state, action: PayloadAction<string | null>) {
      state.marathonError = action.payload;
      state.loadingMarathon = false;
    },

    // Clear state
    clearCourseDetails(state) {
      state.selectedCourse = null;
      state.coursePlans = [];
      state.detailsError = null;
    },
  },
});

// Reducer
export const coursesReducer = coursesSlice.reducer;

// Sync Actions
export const {
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
  clearCourseDetails,
} = coursesSlice.actions;

// Async Actions (for sagas)
export const fetchMyOrders = createAction('COURSES/FETCH_MY_ORDERS');
export const fetchAvailableCourses = createAction('COURSES/FETCH_AVAILABLE_COURSES');
export const fetchDemoCourses = createAction('COURSES/FETCH_DEMO_COURSES');
export const fetchCourseDetails = createAction<string>('COURSES/FETCH_COURSE_DETAILS');
export const fetchCoursePlans = createAction<string>('COURSES/FETCH_COURSE_PLANS');
export const fetchMarathon = createAction<{ marathonId: string; timeZoneOffset: number }>('COURSES/FETCH_MARATHON');
export const createOrder = createAction<string>('COURSES/CREATE_ORDER');
export const purchaseCourse = createAction<{ orderNumber: string; couponCode: string | null }>('COURSES/PURCHASE_COURSE');
export const acceptCourseRules = createAction<{ courseId: string; status: boolean }>('COURSES/ACCEPT_COURSE_RULES');
