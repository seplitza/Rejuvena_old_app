/**
 * Courses Selectors
 * Memoized selectors for courses state
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store';

// Base selectors
const selectCoursesState = (state: RootState) => state.courses;

// My Orders selectors
export const selectMyOrders = createSelector(
  [selectCoursesState],
  (courses) => courses.myOrders
);

export const selectActiveOrders = createSelector(
  [selectMyOrders],
  (orders) => {
    console.log('🔍 SELECTOR selectMyOrders (all orders):', orders);
    console.log('🔍 SELECTOR selectMyOrders.length:', orders.length);
    const filtered = orders.filter(order => {
      const isActive = order.orderStatus === 'Approved' || 
        order.status === 'Active' ||
        order.isPurchased === true;
      console.log('🔍 SELECTOR order check:', {
        id: order.id,
        orderStatus: order.orderStatus,
        status: order.status,
        isPurchased: order.isPurchased,
        isActive
      });
      return isActive;
    });
    console.log('🔍 SELECTOR filtered active orders:', filtered);
    return filtered;
  }
);

export const selectLoadingOrders = createSelector(
  [selectCoursesState],
  (courses) => courses.loadingOrders
);

export const selectOrdersError = createSelector(
  [selectCoursesState],
  (courses) => courses.ordersError
);

// Available Courses selectors
export const selectAvailableCourses = createSelector(
  [selectCoursesState],
  (courses) => courses.availableCourses
);

export const selectDemoCourses = createSelector(
  [selectCoursesState],
  (courses) => courses.demoCourses
);

export const selectAllCourses = createSelector(
  [selectAvailableCourses, selectDemoCourses],
  (available, demo) => [...available, ...demo]
);

export const selectLoadingCourses = createSelector(
  [selectCoursesState],
  (courses) => courses.loadingCourses
);

export const selectCoursesError = createSelector(
  [selectCoursesState],
  (courses) => courses.coursesError
);

// Course Details selectors
export const selectSelectedCourse = createSelector(
  [selectCoursesState],
  (courses) => courses.selectedCourse
);

export const selectCoursePlans = createSelector(
  [selectCoursesState],
  (courses) => courses.coursePlans
);

export const selectLoadingDetails = createSelector(
  [selectCoursesState],
  (courses) => courses.loadingDetails
);

export const selectDetailsError = createSelector(
  [selectCoursesState],
  (courses) => courses.detailsError
);

// Marathon selectors
export const selectMarathons = createSelector(
  [selectCoursesState],
  (courses) => courses.marathons
);

export const selectMarathonById = (marathonId: string) =>
  createSelector(
    [selectMarathons],
    (marathons) => marathons[marathonId]
  );

export const selectLoadingMarathon = createSelector(
  [selectCoursesState],
  (courses) => courses.loadingMarathon
);

export const selectMarathonError = createSelector(
  [selectCoursesState],
  (courses) => courses.marathonError
);

// Combined selectors
export const selectCoursesWithProgress = createSelector(
  [selectActiveOrders, selectMarathons],
  (orders, marathons) => {
    console.log('🔍 SELECTOR selectActiveOrders:', orders);
    console.log('🔍 SELECTOR selectActiveOrders.length:', orders.length);
    const result = orders.map(order => {
      const marathonId = order.wpMarathonId || order.marathonId || order.id;
      return {
        ...order,
        marathonId: marathonId, // Ensure marathonId is set
        marathon: marathons[marathonId],
        progress: marathons[marathonId]?.progress || 0,
        completedDays: marathons[marathonId]?.completedDays || 0,
        totalDays: marathons[marathonId]?.totalDays || order.days || 0,
      };
    });
    console.log('🔍 SELECTOR result:', result);
    return result;
  }
);

export const selectIsCoursePurchased = (courseId: string) =>
  createSelector(
    [selectMyOrders],
    (orders) => orders.some(order => order.marathonId === courseId && order.status === 'Active')
  );
