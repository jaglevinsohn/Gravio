"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface TutorialStep {
    targetId: string;
    title: string;
    description: string;
}

const tutorialSteps: TutorialStep[] = [
    {
        targetId: 'tour-outlook',
        title: 'Welcome to Gravio',
        description: 'Gravio helps you quickly understand your child’s academic progress and what they should focus on each day.\n\nThe Daily Academic Outlook summarizes recent activity and highlights the most important assignments to work on today.\n\nThis is the fastest way to understand your child’s workload.',
    },
    {
        targetId: 'tour-courses',
        title: 'View Each Class',
        description: 'Each course card shows the current grade and category breakdown for that class.\n\nClick any course to view assignments, tests, and detailed grade information.',
    },
    {
        targetId: 'tour-deadlines',
        title: 'Track Upcoming Assignments',
        description: 'This panel shows assignments and tests that are coming up soon.\n\nUse it to quickly see what needs to be completed in the next few days.\n\nYou can also open the full academic calendar for a complete view.',
    },
    {
        targetId: 'tour-calendar',
        title: 'See the Full Academic Calendar',
        description: 'The calendar shows upcoming assignments and assessments across all classes.\n\nThis helps you plan ahead and stay aware of busy weeks.',
    },
    {
        targetId: 'tour-student-switcher',
        title: 'Switch Between Students',
        description: 'If you have multiple students connected to your account, you can switch between them here.\n\nEach student has their own dashboard, grades, and assignments.',
    },
    {
        targetId: 'tour-home-logo',
        title: 'Return Home Anytime',
        description: 'Click the Gravio logo at any time to return to this dashboard.\n\nEnjoy using Gravio to stay connected with your student\'s progress!',
    }
];

export default function TutorialOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
    const [showToast, setShowToast] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check local storage after mount
        const hasCompleted = localStorage.getItem('user.hasCompletedTutorial');
        if (!hasCompleted) {
            // Small delay to ensure the dashboard DOM is fully rendered before trying to find elements
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const updateHighlight = useCallback(() => {
        if (!isVisible || currentStep >= tutorialSteps.length) return;

        const targetId = tutorialSteps[currentStep].targetId;
        const element = document.getElementById(targetId);

        if (element) {
            // Include scroll offset to get absolute page coordinates
            const rect = element.getBoundingClientRect();

            const newX = rect.x + window.scrollX;
            const newY = rect.y + window.scrollY;

            setHighlightRect(prev => {
                // If there's no previous rect or the difference is large enough (prevents micro-jitter), update
                if (!prev || Math.abs(prev.x - newX) > 2 || Math.abs(prev.y - newY) > 2 || Math.abs(prev.width - rect.width) > 2 || Math.abs(prev.height - rect.height) > 2) {
                    return {
                        x: newX,
                        y: newY,
                        width: rect.width,
                        height: rect.height,
                        top: rect.top,
                        bottom: rect.bottom,
                        left: rect.left,
                        right: rect.right,
                        toJSON: rect.toJSON
                    } as DOMRect;
                }
                return prev;
            });
        }
    }, [isVisible, currentStep]);

    // Scroll into view whenever the step changes
    useEffect(() => {
        if (!isVisible || currentStep >= tutorialSteps.length) return;

        const targetId = tutorialSteps[currentStep].targetId;
        const element = document.getElementById(targetId);

        if (element) {
            const rect = element.getBoundingClientRect();
            const padding = 150; // Increased padding
            // Provide a bit more room at the bottom for the tooltip
            if (rect.top < padding || rect.bottom > window.innerHeight - padding * 2) {
                window.scrollTo({
                    top: window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2),
                    behavior: 'smooth'
                });
            }
        }
    }, [isVisible, currentStep]);

    // Recalculate on window resize or scroll
    useEffect(() => {
        if (isVisible) {
            updateHighlight();
            window.addEventListener('resize', updateHighlight);
            window.addEventListener('scroll', updateHighlight);

            // Re-calc after a short delay in case of dynamic DOM shifts (e.g. data loading)
            const interval = setInterval(updateHighlight, 500);
            return () => {
                window.removeEventListener('resize', updateHighlight);
                window.removeEventListener('scroll', updateHighlight);
                clearInterval(interval);
            };
        }
    }, [isVisible, updateHighlight]);

    const handleNext = () => {
        if (currentStep < tutorialSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem('user.hasCompletedTutorial', 'true');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000); // Hide toast after 5s
    };

    const handleSkip = () => {
        setIsVisible(false);
        localStorage.setItem('user.hasCompletedTutorial', 'true');
    };

    if (showToast) {
        return (
            <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                <div className="bg-[#1e2436] border border-indigo-500/30 shadow-2xl rounded-xl p-5 max-w-sm flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-emerald-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="font-bold text-gray-100">You're ready to go</h4>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">You can always revisit this guide from the Help menu.</p>
                    <button
                        onClick={() => setShowToast(false)}
                        className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!isVisible || !highlightRect) return null;

    const stepInfo = tutorialSteps[currentStep];
    const isLastStep = currentStep === tutorialSteps.length - 1;

    // --- Dynamic Tooltip Positioning ---
    const paddingX = 24;
    const paddingY = 24;
    const tooltipWidth = 320;

    // Default to Bottom
    let tooltipTop = highlightRect.y + highlightRect.height + paddingY;
    let tooltipLeft = highlightRect.x + (highlightRect.width / 2) - (tooltipWidth / 2);

    // If step 2 (courses array) or any element where right-placement is better
    // Check if there is enough room on the right side of the highlighted element
    const spaceOnRight = document.body.clientWidth - (highlightRect.x + highlightRect.width);
    const spaceOnLeft = highlightRect.x;

    // If there's > 350px on the right, put it on the right
    if (spaceOnRight > tooltipWidth + paddingX * 2) {
        tooltipLeft = highlightRect.x + highlightRect.width + paddingX;
        // Vertically align with the top of the element, or slightly offset
        tooltipTop = highlightRect.y;
    } else if (spaceOnLeft > tooltipWidth + paddingX * 2) {
        // If there's enough room on the left, put it on the left
        tooltipLeft = highlightRect.x - tooltipWidth - paddingX;
        tooltipTop = highlightRect.y;
    } else {
        // Fallback to bottom centering logic
        if (tooltipLeft < paddingX) tooltipLeft = paddingX;
        if (tooltipLeft + tooltipWidth > document.body.clientWidth - paddingX) tooltipLeft = document.body.clientWidth - tooltipWidth - paddingX;
    }

    return (
        <div className="absolute inset-0 z-50 pointer-events-none" style={{ height: Math.max(document.body.scrollHeight, window.innerHeight) }}>
            {/* Dim Backdrop with a cutout for the target element */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <mask id="cutout">
                        <rect width="100%" height="100%" fill="white" />
                        <rect
                            x={Math.max(0, highlightRect.x - 8)}
                            y={Math.max(0, highlightRect.y - 8)}
                            width={highlightRect.width + 16}
                            height={highlightRect.height + 16}
                            fill="black"
                            rx="12"
                            ry="12"
                        />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.75)" mask="url(#cutout)" className="transition-all duration-500 ease-in-out" />
            </svg>

            {/* Pulsing Outline around the target element */}
            <div
                className="absolute border-2 border-indigo-400 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-500 ease-in-out pointer-events-none"
                style={{
                    left: Math.max(0, highlightRect.x - 8),
                    top: Math.max(0, highlightRect.y - 8),
                    width: highlightRect.width + 16,
                    height: highlightRect.height + 16,
                }}
            />

            {/* Tooltip Card */}
            <div
                className="absolute w-80 bg-[var(--color-card-dark)] border border-indigo-500/40 rounded-2xl shadow-2xl p-6 pointer-events-auto transition-all duration-500 ease-in-out transform"
                style={{
                    top: tooltipTop,
                    left: tooltipLeft,
                    // Use a max-width and let flex handle it if screen is very narrow
                    maxWidth: 'calc(100vw - 40px)'
                }}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step {currentStep + 1} of {tutorialSteps.length}</span>
                    <button onClick={handleSkip} className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors">Skip tour</button>
                </div>

                <h3 className="text-lg font-bold text-white mb-3">{stepInfo.title}</h3>

                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-6">
                    {stepInfo.description}
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-white disabled:opacity-30 transition-colors"
                    >
                        Back
                    </button>

                    <button
                        onClick={handleNext}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-md transition-colors flex items-center gap-2 group"
                    >
                        {isLastStep ? 'Finish' : 'Next'}
                        {!isLastStep && <span className="group-hover:translate-x-1 transition-transform">→</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}
