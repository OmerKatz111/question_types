// Configuration object for easy maintenance
const questionConfig = {
    matching: {
        apple: 'fruit',
        carrot: 'vegetable',
        salmon: 'protein'
    },
    dragDrop: {
        odd: ["1", "3", "5"],
        even: ["2", "4"]
    },
    numberLine: {
        correctPositions: {
            "-5": "-5",
            "-2": "-2",
            "0": "0",
            "1": "1",
            "4": "4"
        }
    }
};

let userMatches = [];

// Utility function for safe DOM queries
function safeQuerySelector(selector, context = document) {
    try {
        return context.querySelector(selector);
    } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
        return null;
    }
}

function safeQuerySelectorAll(selector, context = document) {
    try {
        return context.querySelectorAll(selector);
    } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
        return [];
    }
}

function showFeedback(button, isCorrect) {
    const feedbackDiv = button.parentElement.querySelector('.feedback');
    if (!feedbackDiv) {
        console.warn('Feedback div not found');
        return;
    }

    feedbackDiv.textContent = isCorrect ? "✅ Correct!" : "❌ Incorrect.";
    feedbackDiv.classList.remove("correct", "incorrect");
    feedbackDiv.classList.add(isCorrect ? "correct" : "incorrect");
}

function checkMultipleChoice(groupName, correctValue, button) {
    try {
        const selected = safeQuerySelector(`input[name="${groupName}"]:checked`);
        const isCorrect = selected && selected.value === correctValue;
        showFeedback(button, isCorrect);

        // Add accessibility announcement
        announceResult(isCorrect);
    } catch (error) {
        console.error('Error checking multiple choice:', error);
        showFeedback(button, false);
    }
}

function checkMultipleSelect(groupName, correctValues, button) {
    try {
        const selected = [...safeQuerySelectorAll(`input[name="${groupName}"]:checked`)].map(cb => cb.value);
        const isCorrect = JSON.stringify(selected.sort()) === JSON.stringify(correctValues.sort());
        showFeedback(button, isCorrect);

        announceResult(isCorrect);
    } catch (error) {
        console.error('Error checking multiple select:', error);
        showFeedback(button, false);
    }
}

function checkTrueFalse(correctAnswer, button) {
    try {
        const block = button.closest('.question-block');
        if (!block) {
            console.warn('Question block not found');
            return;
        }

        // Prevent multiple rapid clicks
        if (button.disabled) return;
        button.disabled = true;

        const feedbackDiv = safeQuerySelector('.feedback', block);
        if (feedbackDiv) {
            feedbackDiv.textContent = correctAnswer ? "✅ Correct!" : "❌ Incorrect.";
            feedbackDiv.className = 'feedback ' + (correctAnswer ? 'correct' : 'incorrect');
        }

        // Update ARIA state
        const allButtons = safeQuerySelectorAll('.true-button, .false-button', block);
        allButtons.forEach(btn => {
            btn.setAttribute('aria-checked', 'false');
        });
        button.setAttribute('aria-checked', 'true');

        announceResult(correctAnswer);

        // Re-enable button after short delay
        setTimeout(() => {
            button.disabled = false;
        }, 500);

    } catch (error) {
        console.error('Error checking true/false:', error);
        // Re-enable button on error
        button.disabled = false;
    }
}

// Accessibility function
function announceResult(isCorrect) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only'; // Screen reader only
    announcement.textContent = isCorrect ? 'Correct answer' : 'Incorrect answer';
    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
        if (announcement.parentNode) {
            announcement.parentNode.removeChild(announcement);
        }
    }, 1000);
}

function getCorrectAnswerFromCheckButton(block, isArray = false) {
    if (!block) {
        console.warn('Block element not provided');
        return isArray ? [] : null;
    }

    if (block.classList.contains('true-false-question')) {
        const tfBtn = safeQuerySelector('.true-button, .false-button', block);
        if (!tfBtn) return null;

        const match = tfBtn.getAttribute('onclick')?.match(/checkTrueFalse\((true|false)/);
        return match ? match[1] === 'true' : null;
    }

    const btn = safeQuerySelector('.check-button', block);
    const onClick = btn?.getAttribute('onclick');
    if (!onClick) return isArray ? [] : null;

    try {
        if (isArray) {
            const arrayMatch = onClick.match(/\[([^\]]+)\]/);
            if (!arrayMatch) return [];
            return arrayMatch[1].replace(/'/g, "").split(",").map(s => s.trim());
        }

        const match = onClick.match(/'[^']+',\s*'([^']+)'/);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Error parsing onclick attribute:', error);
        return isArray ? [] : null;
    }
}

function showCorrectAnswer(button) {
    try {
        const block = button.closest('.question-block');
        if (!block) {
            console.warn('Question block not found');
            return;
        }

        if (block.classList.contains('multiple-choice-question')) {
            const correct = getCorrectAnswerFromCheckButton(block);
            safeQuerySelectorAll('input[type="radio"]', block).forEach(r => {
                if (r.parentElement) {
                    r.parentElement.style.backgroundColor = r.value === correct ? '#d4edda' : '';
                }
            });
        }

        if (block.classList.contains('multiple-select-question')) {
            const corrects = getCorrectAnswerFromCheckButton(block, true);
            safeQuerySelectorAll('input[type="checkbox"]', block).forEach(cb => {
                if (cb.parentElement) {
                    cb.parentElement.style.backgroundColor = corrects.includes(cb.value) ? '#d4edda' : '';
                }
            });
        }

        if (block.classList.contains('true-false-question')) {
            const correct = getCorrectAnswerFromCheckButton(block);
            safeQuerySelectorAll('.true-button, .false-button', block).forEach(btn => {
                const isTrue = btn.classList.contains('true-button');
                btn.classList.remove('correct-flash');
                btn.textContent = btn.textContent.replace(' ✅', '');
                if (isTrue === correct) {
                    btn.classList.add('correct-flash');
                    if (!btn.textContent.includes('✅')) btn.textContent += ' ✅';
                }
            });
        }
    } catch (error) {
        console.error('Error showing correct answer:', error);
    }
}

function resetAll() {
    try {
        // Reset radios and checkboxes
        safeQuerySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        safeQuerySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);

        // Clear feedback and styles
        safeQuerySelectorAll('.feedback').forEach(f => {
            f.textContent = '';
            f.classList.remove('correct', 'incorrect');
        });

        safeQuerySelectorAll('.answer-option').forEach(label => {
            label.style.backgroundColor = '';
        });

        safeQuerySelectorAll('.true-button, .false-button').forEach(btn => {
            btn.classList.remove('correct-flash');
            btn.textContent = btn.textContent.replace(' ✅', '');
        });

        // Reset matching
        safeQuerySelectorAll('.match-item').forEach(e => e.classList.remove('selected'));
        userMatches = [];
        redrawLines();

        // Reset drag and drop categorization
        const dragItemsContainer = safeQuerySelector('.drag-items');
        if (dragItemsContainer) {
            safeQuerySelectorAll('.drop-zone').forEach(zone => {
                zone.style.borderColor = '#aaa';
                // Move any draggable children back to the drag-items container
                const items = safeQuerySelectorAll('.draggable', zone);
                items.forEach(item => dragItemsContainer.appendChild(item));
            });

            // Shuffle drag items
            const items = Array.from(dragItemsContainer.children);
            items.sort(() => Math.random() - 0.5);
            items.forEach(item => dragItemsContainer.appendChild(item));
        }
        resetNumberLine();

        console.log('Reset completed successfully');
    } catch (error) {
        console.error('Error during reset:', error);
    }
}

function showAllCorrectAnswers() {
    try {
        console.log('Showing all correct answers...');

        safeQuerySelectorAll('.show-answer-button').forEach(button => {
            const block = button.closest('.question-block');
            if (!block) return;

            if (block.classList.contains('matching-question')) {
                showMatchingAnswer(button);
            } else if (block.classList.contains('drag-drop-categorization')) {
                showDragDropAnswer(button);
            } else if (block.classList.contains('number-line-question')) {
                showNumberLineAnswer(button);
            } else {
                showCorrectAnswer(button);
            }
        });

        // Add global feedback message
        const globalFeedback = document.createElement('div');
        globalFeedback.className = 'feedback correct';
        globalFeedback.textContent = '✅ All correct answers revealed!';
        globalFeedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            max-width: 90%;
            text-align: center;
            margin: 0;
            animation: slideInFromTop 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        globalFeedback.setAttribute('aria-live', 'polite');

        if (!document.getElementById('notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes slideInFromTop {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                @keyframes fadeOut {
                    0% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-10px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(globalFeedback);

        setTimeout(() => {
            if (globalFeedback.parentNode) {
                globalFeedback.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => {
                    if (globalFeedback.parentNode) {
                        globalFeedback.parentNode.removeChild(globalFeedback);
                    }
                }, 300);
            }
        }, 2000);

        console.log('All correct answers shown successfully');
    } catch (error) {
        console.error('Error showing all correct answers:', error);
    }
}

// --- Matching Functions ---
function checkMatching(button) {
    try {
        const correct = questionConfig.matching;
        let allCorrect = true;

        for (const pair of userMatches) {
            const [leftId, rightId] = pair;
            if (correct[leftId] !== rightId) {
                allCorrect = false;
                break;
            }
        }

        // Check if all items are matched
        const totalItems = Object.keys(correct).length;
        if (userMatches.length !== totalItems) {
            allCorrect = false;
        }

        showFeedback(button, allCorrect);
        announceResult(allCorrect);
    } catch (error) {
        console.error('Error checking matching:', error);
        showFeedback(button, false);
    }
}

function showMatchingAnswer(button) {
    try {
        userMatches = Object.entries(questionConfig.matching);
        redrawLines();

        const block = button.closest('.question-block');
        if (block) {
            const feedbackDiv = safeQuerySelector('.feedback', block);
            if (feedbackDiv) {
                feedbackDiv.textContent = "✅ Correct matches shown.";
                feedbackDiv.className = 'feedback correct';
            }
        }
    } catch (error) {
        console.error('Error showing matching answer:', error);
    }
}

function redrawLines() {
    try {
        const svg = safeQuerySelector('.matching-lines');
        if (!svg) {
            console.warn('SVG element not found');
            return;
        }

        svg.innerHTML = '';

        for (const [leftId, rightId] of userMatches) {
            const left = safeQuerySelector(`.left-item[data-id="${leftId}"]`);
            const right = safeQuerySelector(`.right-item[data-id="${rightId}"]`);

            if (!left || !right) {
                console.warn(`Could not find elements for match: ${leftId} -> ${rightId}`);
                continue;
            }

            const svgRect = svg.getBoundingClientRect();
            const leftRect = left.getBoundingClientRect();
            const rightRect = right.getBoundingClientRect();

            const x1 = leftRect.right - svgRect.left;
            const y1 = leftRect.top + leftRect.height / 2 - svgRect.top;
            const x2 = rightRect.left - svgRect.left;
            const y2 = rightRect.top + rightRect.height / 2 - svgRect.top;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#4caf50');
            line.setAttribute('stroke-width', '3');
            line.setAttribute('aria-hidden', 'true'); // Hide from screen readers
            svg.appendChild(line);
        }
    } catch (error) {
        console.error('Error redrawing lines:', error);
    }
}

function shuffleColumn(selector) {
    try {
        const parent = safeQuerySelector(selector);
        if (!parent) {
            console.warn(`Column not found: ${selector}`);
            return;
        }

        const items = Array.from(parent.children);
        items.sort(() => Math.random() - 0.5);
        items.forEach(item => parent.appendChild(item));
    } catch (error) {
        console.error(`Error shuffling column ${selector}:`, error);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Shuffle matching columns
        shuffleColumn('.left-column');
        shuffleColumn('.right-column');

        // Initialize matching interaction
        initMatchingInteraction();

        // Initialize drag and drop
        initCategorizationDragDrop();

        initNumberLineInteraction();

        console.log('Initialization completed successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

function initMatchingInteraction() {
    let firstSelection = null;
    let firstIsLeft = null;

    safeQuerySelectorAll('.match-item').forEach(item => {
        // Add keyboard support
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');

        const clickHandler = () => {
            const isLeft = item.classList.contains('left-item');

            if (firstSelection === null) {
                safeQuerySelectorAll('.match-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                firstSelection = item.dataset.id;
                firstIsLeft = isLeft;
                item.setAttribute('aria-pressed', 'true');
            } else {
                const secondSelection = item.dataset.id;
                const secondIsLeft = isLeft;

                if (firstIsLeft === secondIsLeft) {
                    // Same side, select new item
                    safeQuerySelectorAll('.match-item').forEach(el => {
                        el.classList.remove('selected');
                        el.setAttribute('aria-pressed', 'false');
                    });
                    item.classList.add('selected');
                    item.setAttribute('aria-pressed', 'true');
                    firstSelection = item.dataset.id;
                    firstIsLeft = isLeft;
                } else {
                    // Different sides, create match
                    const leftId = firstIsLeft ? firstSelection : secondSelection;
                    const rightId = firstIsLeft ? secondSelection : firstSelection;

                    // Remove existing match for this left item
                    userMatches = userMatches.filter(pair => pair[0] !== leftId);
                    userMatches.push([leftId, rightId]);

                    safeQuerySelectorAll('.match-item').forEach(el => {
                        el.classList.remove('selected');
                        el.setAttribute('aria-pressed', 'false');
                    });

                    firstSelection = null;
                    firstIsLeft = null;
                    redrawLines();
                }
            }
        };

        item.addEventListener('click', clickHandler);

        // Keyboard support
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clickHandler();
            }
        });
    });
}

// Add this function for mobile touch support
function addTouchSupport(draggable, dropZones) {
    let draggedElement = null;

    draggable.addEventListener('touchstart', (e) => {
        draggedElement = draggable;
        draggable.style.opacity = '0.8';
        draggable.style.transform = 'scale(1.1)';
        draggable.classList.add('dragging');
        e.preventDefault(); // Prevent scrolling
    });

    draggable.addEventListener('touchend', (e) => {
        if (draggedElement) {
            draggedElement.style.opacity = '';
            draggedElement.style.transform = '';
            draggedElement.classList.remove('dragging');
            draggedElement = null;
        }
    });

    draggable.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling while dragging
    });

    dropZones.forEach(zone => {
        zone.addEventListener('touchstart', (e) => {
            if (draggedElement) {
                e.preventDefault();

                // Handle different zone types
                if (zone.classList.contains('drop-zone')) {
                    // For categorization drag & drop
                    zone.appendChild(draggedElement);
                    console.log(`Touch moved ${draggedElement.dataset.value} to ${zone.dataset.category}`);
                } else if (zone.classList.contains('number-position')) {
                    // For number line
                    const existingNumber = zone.querySelector('.number-item');
                    if (existingNumber) {
                        // Move existing number back to collection
                        const collection = document.querySelector('.number-collection');
                        if (collection) {
                            existingNumber.classList.remove('placed');
                            collection.appendChild(existingNumber);
                        }
                    }
                    // Place the new number
                    zone.appendChild(draggedElement);
                    draggedElement.classList.add('placed');
                    console.log(`Touch placed ${draggedElement.dataset.value} at position ${zone.dataset.position}`);
                }

                // Reset dragged element
                draggedElement.style.opacity = '';
                draggedElement.style.transform = '';
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
        });
    });
}

// --- Drag & Drop Functions ---
function initCategorizationDragDrop() {
    try {
        const draggables = safeQuerySelectorAll('.drag-drop-categorization .draggable');
        const dropZones = safeQuerySelectorAll('.drag-drop-categorization .drop-zone');

        draggables.forEach(draggable => {
            draggable.setAttribute('draggable', 'true');

            // Add keyboard support
            draggable.setAttribute('tabindex', '0');
            draggable.setAttribute('role', 'button');
            draggable.setAttribute('aria-grabbed', 'false');
            addTouchSupport(draggable, dropZones);

            draggable.addEventListener('dragstart', (e) => {
                draggable.classList.add('dragging');
                draggable.setAttribute('aria-grabbed', 'true');
                e.dataTransfer.setData('text/plain', draggable.dataset.value);
            });

            draggable.addEventListener('dragend', () => {
                draggable.classList.remove('dragging');
                draggable.setAttribute('aria-grabbed', 'false');
            });

            // Keyboard support for drag items
            draggable.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Could implement keyboard-based moving here
                    console.log('Keyboard interaction on draggable item');
                }
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');

                const draggedValue = e.dataTransfer.getData('text/plain');
                const dragging = safeQuerySelector(`[data-value="${draggedValue}"].dragging`);

                if (dragging) {
                    zone.appendChild(dragging);
                    console.log(`Moved item ${draggedValue} to ${zone.dataset.category}`);
                }
            });
        });

        console.log('Drag and drop initialized successfully');
    } catch (error) {
        console.error('Error initializing drag and drop:', error);
    }
}

function checkDragDrop(button) {
    try {
        const block = button.closest('.drag-drop-categorization');
        if (!block) {
            console.warn('Drag drop block not found');
            return;
        }

        const zones = safeQuerySelectorAll('.drop-zone', block);
        const correct = questionConfig.dragDrop;
        let allCorrect = true;

        zones.forEach(zone => {
            const category = zone.getAttribute('data-category');
            const expected = correct[category] || [];
            const actual = [...safeQuerySelectorAll('.draggable', zone)].map(el => el.dataset.value);
            const isMatch = JSON.stringify([...expected].sort()) === JSON.stringify([...actual].sort());

            if (!isMatch) {
                allCorrect = false;
                zone.style.borderColor = '#e57373';
            } else {
                zone.style.borderColor = '#81c784';
            }
        });

        const feedback = safeQuerySelector('.feedback', block);
        if (feedback) {
            feedback.textContent = allCorrect ? "✅ All correctly categorized!" : "❌ Some items are misplaced.";
            feedback.className = 'feedback ' + (allCorrect ? 'correct' : 'incorrect');
        }

        announceResult(allCorrect);
    } catch (error) {
        console.error('Error checking drag drop:', error);
    }
}

function showDragDropAnswer(button) {
    try {
        const block = button.closest('.drag-drop-categorization');
        if (!block) {
            console.warn('Drag drop block not found');
            return;
        }

        const correct = questionConfig.dragDrop;
        const dragItems = safeQuerySelectorAll('.draggable', block);
        const allItems = Array.from(dragItems).map(el => ({ value: el.dataset.value, el }));
        const zones = safeQuerySelectorAll('.drop-zone', block);

        zones.forEach(zone => {
            const category = zone.getAttribute('data-category');
            const values = correct[category] || [];
            const header = safeQuerySelector('h3', zone)?.textContent || '';

            zone.innerHTML = `<h3>${header}</h3>`;

            values.forEach(v => {
                const item = allItems.find(i => i.value === v);
                if (item && item.el) {
                    zone.appendChild(item.el);
                }
            });

            zone.style.borderColor = '#81c784';
        });

        const feedback = safeQuerySelector('.feedback', block);
        if (feedback) {
            feedback.textContent = "✅ Correct placements shown.";
            feedback.className = 'feedback correct';
        }

        // Rebind drag events
        initCategorizationDragDrop();
    } catch (error) {
        console.error('Error showing drag drop answer:', error);
    }
}

// Number Line Functions
function initNumberLineInteraction() {
    try {
        const numberItems = safeQuerySelectorAll('.number-line-question .number-item');
        const numberPositions = safeQuerySelectorAll('.number-line-question .number-position');

        // Initialize draggable number items
        numberItems.forEach(item => {
            item.setAttribute('draggable', 'true');
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.setAttribute('aria-grabbed', 'false');
            addTouchSupport(item, numberPositions);

            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                item.setAttribute('aria-grabbed', 'true');
                e.dataTransfer.setData('text/plain', item.dataset.value);
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                item.setAttribute('aria-grabbed', 'false');
            });

            // Keyboard support
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    console.log('Keyboard interaction on number item:', item.dataset.value);
                }
            });
        });

        // Initialize drop zones
        numberPositions.forEach(position => {
            position.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                position.classList.add('drag-over');
            });

            position.addEventListener('dragleave', () => {
                position.classList.remove('drag-over');
            });

            position.addEventListener('drop', (e) => {
                e.preventDefault();
                position.classList.remove('drag-over');

                const draggedValue = e.dataTransfer.getData('text/plain');
                const draggedItem = safeQuerySelector(`[data-value="${draggedValue}"].dragging`);

                if (draggedItem && position) {
                    // Remove any existing number in this position
                    const existingNumber = position.querySelector('.number-item');
                    if (existingNumber) {
                        // Move existing number back to collection
                        const collection = safeQuerySelector('.number-collection');
                        if (collection) {
                            existingNumber.classList.remove('placed');
                            collection.appendChild(existingNumber);
                        }
                    }

                    // Place the new number
                    position.appendChild(draggedItem);
                    draggedItem.classList.add('placed');
                    console.log(`Placed ${draggedValue} at position ${position.dataset.position}`);
                }
            });
        });

        console.log('Number line interaction initialized successfully');
    } catch (error) {
        console.error('Error initializing number line interaction:', error);
    }
}

function checkNumberLine(button) {
    try {
        const block = button.closest('.number-line-question');
        if (!block) {
            console.warn('Number line block not found');
            return;
        }

        const positions = safeQuerySelectorAll('.number-position', block);
        const correct = questionConfig.numberLine.correctPositions;
        let allCorrect = true;
        let placedCount = 0;

        // Reset position states
        positions.forEach(position => {
            position.classList.remove('correct', 'incorrect');
        });

        // Check each position
        positions.forEach(position => {
            const expectedValue = position.dataset.position;
            const numberItem = position.querySelector('.number-item');

            if (numberItem) {
                placedCount++;
                const actualValue = numberItem.dataset.value;

                if (correct[actualValue] === expectedValue) {
                    position.classList.add('correct');
                    console.log(`✓ Correct: ${actualValue} at position ${expectedValue}`);
                } else {
                    position.classList.add('incorrect');
                    allCorrect = false;
                    console.log(`✗ Incorrect: ${actualValue} at position ${expectedValue}`);
                }
            }
        });

        // Check if all numbers are placed
        const totalNumbers = Object.keys(correct).length;
        if (placedCount !== totalNumbers) {
            allCorrect = false;
        }

        const feedback = safeQuerySelector('.feedback', block);
        if (feedback) {
            if (placedCount === 0) {
                feedback.textContent = "❌ Please place the numbers on the line first.";
                feedback.className = 'feedback incorrect';
            } else if (placedCount < totalNumbers) {
                feedback.textContent = `❌ Please place all ${totalNumbers} numbers on the line.`;
                feedback.className = 'feedback incorrect';
            } else if (allCorrect) {
                feedback.textContent = "✅ Perfect! All numbers are correctly placed.";
                feedback.className = 'feedback correct';
            } else {
                feedback.textContent = "❌ Some numbers are in the wrong positions.";
                feedback.className = 'feedback incorrect';
            }
        }

        announceResult(allCorrect && placedCount === totalNumbers);
    } catch (error) {
        console.error('Error checking number line:', error);
    }
}

function showNumberLineAnswer(button) {
    try {
        const block = button.closest('.number-line-question');
        if (!block) {
            console.warn('Number line block not found');
            return;
        }

        const positions = safeQuerySelectorAll('.number-position', block);
        const collection = safeQuerySelector('.number-collection', block);
        const correct = questionConfig.numberLine.correctPositions;

        if (!collection) {
            console.warn('Number collection not found');
            return;
        }

        // Move all numbers back to collection first
        positions.forEach(position => {
            const numberItem = position.querySelector('.number-item');
            if (numberItem) {
                numberItem.classList.remove('placed');
                collection.appendChild(numberItem);
            }
            position.classList.remove('correct', 'incorrect');
        });

        // Place each number in its correct position
        Object.entries(correct).forEach(([numberValue, positionValue]) => {
            const numberItem = safeQuerySelector(`[data-value="${numberValue}"]`, block);
            const position = safeQuerySelector(`[data-position="${positionValue}"]`, positions[0].parentElement);

            if (numberItem && position) {
                position.appendChild(numberItem);
                numberItem.classList.add('placed');
                position.classList.add('correct');
            }
        });

        const feedback = safeQuerySelector('.feedback', block);
        if (feedback) {
            feedback.textContent = "✅ Correct placement shown.";
            feedback.className = 'feedback correct';
        }

        console.log('Number line correct answers shown');
    } catch (error) {
        console.error('Error showing number line answer:', error);
    }
}

function resetNumberLine() {
    try {
        const block = safeQuerySelector('.number-line-question');
        if (!block) return;

        const positions = safeQuerySelectorAll('.number-position', block);
        const collection = safeQuerySelector('.number-collection', block);

        if (!collection) return;

        // Move all numbers back to collection
        positions.forEach(position => {
            const numberItem = position.querySelector('.number-item');
            if (numberItem) {
                numberItem.classList.remove('placed');
                collection.appendChild(numberItem);
            }
            position.classList.remove('correct', 'incorrect', 'drag-over');
        });

        // Shuffle numbers in collection
        const numberItems = Array.from(collection.children);
        numberItems.sort(() => Math.random() - 0.5);
        numberItems.forEach(item => collection.appendChild(item));

        // Clear feedback
        const feedback = safeQuerySelector('.feedback', block);
        if (feedback) {
            feedback.textContent = '';
            feedback.classList.remove('correct', 'incorrect');
        }

        console.log('Number line reset completed');
    } catch (error) {
        console.error('Error resetting number line:', error);
    }
}

