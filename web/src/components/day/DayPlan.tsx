/**
 * Day Plan Component
 * Displays collapsible categories with exercises
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectDayCategories,
  selectActiveExerciseId,
  selectChangingStatusRequests,
  selectUpdatedExercisesStatus,
  selectMarathonDay,
} from '@/store/modules/day/selectors';
import { setActiveExerciseId, changeExerciseStatus } from '@/store/modules/day/slice';
import ExerciseItem from './ExerciseItem';
import ExerciseDetailModal from './ExerciseDetailModal';
import type { Exercise } from '@/store/modules/day/slice';
import Image from 'next/image';

export default function DayPlan() {
  const router = useRouter();
  const { courseId, dayId } = router.query;
  const dispatch = useAppDispatch();
  const dayCategories = useAppSelector(selectDayCategories);
  const activeExerciseId = useAppSelector(selectActiveExerciseId);
  const changingStatusRequests = useAppSelector(selectChangingStatusRequests);
  const updatedExercisesStatus = useAppSelector(selectUpdatedExercisesStatus);
  const marathonDay = useAppSelector(selectMarathonDay);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    // Initially all categories are expanded
    const initial: Record<string, boolean> = {};
    dayCategories.forEach(cat => {
      initial[cat.id] = true;
    });
    return initial;
  });

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const handleExerciseClick = (exercise: Exercise, uniqueId: string) => {
    if (exercise.blockExercise) return;
    
    // Toggle active exercise
    const newActiveId = activeExerciseId === uniqueId ? null : uniqueId;
    dispatch(setActiveExerciseId(newActiveId));
  };

  const handleExerciseCheck = (exercise: Exercise, uniqueId: string) => {
    if (exercise.blockExercise || changingStatusRequests[uniqueId]) return;
    
    const currentStatus = updatedExercisesStatus[uniqueId] !== undefined 
      ? updatedExercisesStatus[uniqueId] 
      : exercise.isDone;
    
    dispatch(changeExerciseStatus({
      marathonExerciseId: exercise.marathonExerciseId,
      status: !currentStatus,
      dayId: marathonDay?.id || '',
      uniqueId,
    }));
    
    // Open modal immediately after checking
    setSelectedExercise(exercise);
  };

  const handleExerciseDetailClick = (exercise: Exercise) => {
    // Open modal instead of navigating to separate page
    setSelectedExercise(exercise);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  if (!dayCategories || dayCategories.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-gray-500">На этот день упражнения не запланированы</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold">План дня</h2>
        </div>

        {/* Categories */}
        <div className="divide-y divide-gray-200">
          {dayCategories.map((category) => {
            const isExpanded = expandedCategories[category.id];
            
            return (
              <div key={category.id} className="bg-white">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {/* Category Icon */}
                    {category.imagePath && (
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <Image
                          src={category.imagePath}
                          alt={category.categoryName}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    
                    {/* Category Name */}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.categoryName}
                    </h3>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <svg
                    className={`w-6 h-6 text-gray-400 transition-transform ${
                      isExpanded ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Exercises List */}
                {isExpanded && (
                  <div className="px-6 pb-4 space-y-2">
                    {category.exercises.map((exercise, index) => {
                      const uniqueId = `${index}-${category.id}-${exercise.id}`;
                      const isActive = activeExerciseId === uniqueId;
                      const currentStatus = updatedExercisesStatus[uniqueId] !== undefined
                        ? updatedExercisesStatus[uniqueId]
                        : exercise.isDone;
                      const isChanging = changingStatusRequests[uniqueId];

                      return (
                        <ExerciseItem
                          key={uniqueId}
                          exercise={exercise}
                          uniqueId={uniqueId}
                          isActive={isActive}
                          isDone={currentStatus}
                          isChanging={isChanging}
                          onToggle={() => handleExerciseClick(exercise, uniqueId)}
                          onCheck={() => handleExerciseCheck(exercise, uniqueId)}
                          onDetailClick={() => handleExerciseDetailClick(exercise)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          isOpen={!!selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </>
  );
}
