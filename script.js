// 앱 상태 관리
let currentSession = null;
let currentUser = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let questions = [];
let isSubmitting = false; // 중복 제출 방지 플래그

// API 기본 URL
const API_BASE_URL = 'https://personality-quiz-app.onrender.com/api';

// DOM 요소들
// (기존 screens 객체 정의 부분 삭제)

// MBTI 관련 코드 전체 제거
// 1. getMbtiInfo, updateMbtiInfoBox, updateMbtiInfoBoxComplete, updateMbtiResultBox, saveMbti 함수 삭제
// 2. MBTI_TYPES, MBTI_INFO 상수 삭제
// 3. MBTI 입력/저장/표시 관련 DOM 이벤트 및 코드 삭제
// 4. showScreen 함수에서 setupMbtiOtpInput 관련 코드 삭제

function showScreen(screenKey) {
    const screens = window.screens; // 항상 최신 screens 참조
    if (!screens) return;
    // 모든 화면 숨기기
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active', 'prev');
    });
    // 현재 활성화된 화면을 prev로 설정
    const currentActive = document.querySelector('.screen.active');
    if (currentActive) {
        currentActive.classList.add('prev');
    }
    // 새 화면 활성화
    if (screens[screenKey]) {
        screens[screenKey].classList.add('active');
        // MBTI OTP 입력 초기화 코드 완전 삭제
    }
}

// API 호출 함수
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API 호출 중 오류가 발생했습니다.');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API 호출 오류:', error);
        alert(error.message);
        throw error;
    }
}

// 세션 생성
async function createSession(user1Name, user2Name) {
    try {
        const result = await apiCall('/sessions', {
            method: 'POST',
            body: JSON.stringify({ user1Name, user2Name })
        });

        // result.sessionId가 실제로 있는지 콘솔로 확인
        console.log('세션 생성 결과:', result);

        currentSession = {
            id: result.sessionId, // 반드시 sessionId!
            user1Name: result.user1Name,
            user2Name: result.user2Name,
            user1Completed: false,
            user2Completed: false
        };
        questions = result.questions;

        updateSessionInfo();
        showScreen('sessionInfo');
        return result;
    } catch (error) {
        console.error('세션 생성 실패:', error);
    }
}

// 세션 참여
async function joinSession(sessionId, userName) {
    try {
        const result = await apiCall(`/sessions/${sessionId}`);
        
        // 사용자 확인
        if (result.user1Name !== userName && result.user2Name !== userName) {
            throw new Error('세션에 참여하지 않은 사용자입니다.');
        }
        
        currentSession = result;
        currentUser = userName;
        
        // 질문 데이터 가져오기
        const sessionData = await apiCall('/sessions', {
            method: 'POST',
            body: JSON.stringify({ 
                user1Name: result.user1Name, 
                user2Name: result.user2Name 
            })
        });
        questions = sessionData.questions;
        
        // 세션 정보 화면 업데이트
        updateSessionInfo();
        showScreen('sessionInfo');
        
        return result;
    } catch (error) {
        console.error('세션 참여 실패:', error);
    }
}

// 세션 정보 업데이트
function updateSessionInfo() {
    if (!currentSession) return;
    
    document.getElementById('display-session-id').textContent = currentSession.id;
    document.getElementById('participant1-name').textContent = currentSession.user1Name;
    document.getElementById('participant2-name').textContent = currentSession.user2Name;
    
    // 상태 업데이트
    const status1 = document.getElementById('participant1-status');
    const status2 = document.getElementById('participant2-status');
    
    status1.className = `status ${currentSession.user1Completed ? 'completed' : 'pending'}`;
    status1.textContent = currentSession.user1Completed ? '완료' : '대기 중';
    
    status2.className = `status ${currentSession.user2Completed ? 'completed' : 'pending'}`;
    status2.textContent = currentSession.user2Completed ? '완료' : '대기 중';
    
    // 결과 확인 버튼 표시/숨김
    const checkResultsBtn = document.getElementById('check-results');
    if (currentSession.user1Completed && currentSession.user2Completed) {
        checkResultsBtn.style.display = 'block';
    } else {
        checkResultsBtn.style.display = 'none';
    }
}

// 퀴즈 초기화
function initQuiz() {
    currentQuestionIndex = 0;
    userAnswers = [];
    updateProgress();
    showQuestion();
}

// 진행률 업데이트
function updateProgress() {
    const percentage = ((currentQuestionIndex + 1) / questions.length) * 100;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('progress-text').textContent = `${currentQuestionIndex + 1}/${questions.length}`;
}

// 질문 표시
function showQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('question-text').textContent = question.question;
    document.getElementById('quiz-user-name').textContent = currentUser;
    
    // 옵션 버튼 업데이트
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons[0].querySelector('.option-text').textContent = question.options.A;
    optionButtons[1].querySelector('.option-text').textContent = question.options.B;
    
    // 선택 상태 초기화
    optionButtons.forEach(btn => btn.classList.remove('selected'));
    
    updateProgress();
}

// 답변 처리
function handleAnswer(answerType) {
    // 선택된 버튼 표시
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.type === answerType) {
            btn.classList.add('selected');
        }
    });
    
    // 답변 저장
    userAnswers.push(answerType);
    
    // 마지막 문제라면 버튼 비활성화
    if (currentQuestionIndex === questions.length - 1) {
        optionButtons.forEach(btn => btn.disabled = true);
    }
    
    // 잠시 후 다음 단계로
    setTimeout(() => {
        nextStep();
    }, 800);
}

// 다음 단계 처리
function nextStep() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else {
        // 모든 질문 완료
        submitAnswers();
    }
}

// 답변 제출
async function submitAnswers() {
    if (isSubmitting) return; // 중복 제출 방지
    isSubmitting = true;
    if (userAnswers.length !== questions.length) {
        alert('모든 질문에 답변해주세요.');
        isSubmitting = false;
        return;
    }
    try {
        const result = await apiCall(`/sessions/${currentSession.id}/answers`, {
            method: 'POST',
            body: JSON.stringify({
                userName: currentUser,
                answers: userAnswers
            })
        });
        
        if (result.completed) {
            showResults();
        } else {
            showScreen('completion');
        }
    } catch (error) {
        console.error('답변 제출 실패:', error);
    } finally {
        isSubmitting = false;
    }
}

// MBTI 저장 API 호출
async function saveMbti(sessionId, userName, mbti) {
    try {
        await apiCall(`/sessions/${sessionId}/mbti`, {
            method: 'POST',
            body: JSON.stringify({ userName, mbti })
        });
    } catch (e) {
        // 실패해도 무시(UX)
    }
}

// MBTI 입력 및 저장 (한 줄 input 방식)
document.addEventListener('DOMContentLoaded', function() {
    // screens 객체를 DOMContentLoaded 이후에 정의
    window.screens = {
        start: document.getElementById('start-screen'),
        createSession: document.getElementById('create-session-screen'),
        joinSession: document.getElementById('join-session-screen'),
        sessionInfo: document.getElementById('session-info-screen'),
        quiz: document.getElementById('quiz-screen'),
        completion: document.getElementById('completion-screen'),
        result: document.getElementById('result-screen')
    };

    // 시작 화면 버튼들
    const createBtn = document.getElementById('create-session-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            showScreen('createSession');
        });
    }

    const joinBtn = document.getElementById('join-session-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            showScreen('joinSession');
        });
    }

    // 뒤로 가기 버튼들
    const backBtn1 = document.getElementById('back-to-start');
    if (backBtn1) {
        backBtn1.addEventListener('click', () => {
            showScreen('start');
        });
    }

    const backBtn2 = document.getElementById('back-to-start-2');
    if (backBtn2) {
        backBtn2.addEventListener('click', () => {
            showScreen('start');
        });
    }
    
    // 세션 생성
    const createSessionBtn = document.getElementById('create-session');
    if (createSessionBtn) {
        createSessionBtn.addEventListener('click', async () => {
            const user1Name = document.getElementById('create-user1-name').value.trim();
            const user2Name = document.getElementById('create-user2-name').value.trim();
            if (!user1Name || !user2Name) {
                alert('두 사람의 이름을 모두 입력해주세요!');
                return;
            }
            await createSession(user1Name, user2Name);
        });
    }
    
    // 세션 참여
    const joinSessionBtn = document.getElementById('join-session');
    if (joinSessionBtn) {
        joinSessionBtn.addEventListener('click', async () => {
            const sessionId = document.getElementById('session-id').value.trim();
            const userName = document.getElementById('join-user-name').value.trim();
            if (!sessionId || !userName) {
                alert('세션 ID와 이름을 모두 입력해주세요!');
                return;
            }
            await joinSession(sessionId, userName);
        });
    }
    
    // 세션 정보 화면 버튼들
    const copySessionIdBtn = document.getElementById('copy-session-id');
    if (copySessionIdBtn) {
        copySessionIdBtn.addEventListener('click', copySessionId);
    }
    
    const startMyQuizBtn = document.getElementById('start-my-quiz');
    if (startMyQuizBtn) {
        startMyQuizBtn.addEventListener('click', () => {
            if (!currentUser) {
                currentUser = currentSession.user1Name;
            }
            initQuiz();
            showScreen('quiz');
        });
    }
    
    const checkResultsBtn = document.getElementById('check-results');
    if (checkResultsBtn) {
        checkResultsBtn.addEventListener('click', showResults);
    }
    
    // 퀴즈 화면
    const optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const answerType = btn.dataset.type;
            handleAnswer(answerType);
        });
    });
    
    // 답변 완료 화면
    const backToSessionBtn = document.getElementById('back-to-session');
    if (backToSessionBtn) {
        backToSessionBtn.addEventListener('click', () => {
            updateSessionInfo();
            showScreen('sessionInfo');
        });
    }
    
    // 결과 화면
    const restartQuizBtn = document.getElementById('restart-quiz');
    if (restartQuizBtn) {
        restartQuizBtn.addEventListener('click', () => {
            if (window.location.search.includes('result=')) {
                window.history.replaceState({}, '', window.location.pathname);
            }
            currentSession = null;
            currentUser = null;
            currentQuestionIndex = 0;
            userAnswers = [];
            showScreen('start');
        });
    }
    
    const shareResultBtn = document.getElementById('share-result');
    if (shareResultBtn) {
        shareResultBtn.addEventListener('click', shareResult);
    }
    
    // 입력 필드 엔터 키 처리
    const createUser1NameInput = document.getElementById('create-user1-name');
    if (createUser1NameInput) {
        createUser1NameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('create-user2-name').focus();
            }
        });
    }
    
    const createUser2NameInput = document.getElementById('create-user2-name');
    if (createUser2NameInput) {
        createUser2NameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('create-session').click();
            }
        });
    }
    
    const sessionIdInput = document.getElementById('session-id');
    if (sessionIdInput) {
        sessionIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('join-user-name').focus();
            }
        });
    }
    
    const joinUserNameInput = document.getElementById('join-user-name');
    if (joinUserNameInput) {
        joinUserNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('join-session').click();
            }
        });
    }
    
    // 페이지 로드 시 시작 화면 표시
    showScreen('start');
});

// 터치 이벤트 최적화
document.addEventListener('touchstart', function() {}, {passive: true});
document.addEventListener('touchmove', function() {}, {passive: true});

// 결과 화면 MBTI 표시 개선
function updateMbtiResultBox(user1Mbti, user2Mbti, isUser1) {
    setupMbtiOtpInputResult(isUser1 ? user1Mbti : user2Mbti, isUser1);
    // 궁합/설명 표시
    const infoBox = document.getElementById('mbti-info-box');
    if (user1Mbti && user2Mbti && MBTI_TYPES.includes(user1Mbti) && MBTI_TYPES.includes(user2Mbti)) {
        const info = getMbtiInfo(user1Mbti, user2Mbti);
        infoBox.innerHTML = `
            <div><strong>궁합:</strong> ${info.compatibility}</div>
            <div style="margin:8px 0 4px 0;"><strong>설명:</strong> ${info.desc}</div>
            <div><strong>대화팁:</strong> ${info.tip}</div>
        `;
    } else {
        infoBox.innerHTML = '<p class="mbti-info-default">상대방이 아직 MBTI를 입력하지 않았어요.</p>';
    }
}

// 결과 조회
async function showResults() {
    try {
        const result = await apiCall(`/sessions/${currentSession.id}/results`);
        displayResults(result);
        showScreen('result');
        // 결과 화면 MBTI 표시 개선
        setTimeout(() => {
            // 예시: result.session.user1Mbti, result.session.user2Mbti가 있다고 가정
            const isUser1 = currentUser === result.session.user1Name;
            updateMbtiResultBox(result.session.user1Mbti, result.session.user2Mbti, isUser1);
        }, 100);
    } catch (error) {
        console.error('결과 조회 실패:', error);
    }
}

// 결과 표시
function displayResults(result) {
    // 전체 유사성(일치율)에는 반드시 result.matchPercentage 사용
    const overallElem = document.getElementById('overall-score');
    if (overallElem) overallElem.textContent = result.matchPercentage;
    // 나머지 항목별 유사성은 matchingAnalysis 사용
    const socialElem = document.getElementById('social-score');
    if (socialElem) socialElem.textContent = result.matchingAnalysis.socialCompatibility;
    const decisionElem = document.getElementById('decision-score');
    if (decisionElem) decisionElem.textContent = result.matchingAnalysis.decisionCompatibility;
    const lifestyleElem = document.getElementById('lifestyle-score');
    if (lifestyleElem) lifestyleElem.textContent = result.matchingAnalysis.lifestyleCompatibility;
    // 이름 등 나머지 정보 표시
    const user1Elem = document.getElementById('result-user1');
    const user2Elem = document.getElementById('result-user2');
    if (user1Elem) user1Elem.textContent = result.session.user1Name;
    if (user2Elem) user2Elem.textContent = result.session.user2Name;
    // 답변 비교 표시
    displayAnswerComparison(
        result.comparison,
        result.session.user1Name,
        result.session.user2Name,
        currentUser === result.session.user1Name
    );
}

// 매칭 분석 표시
function displayMatchingAnalysis(matching) {
    document.getElementById('overall-score').textContent = matching.overall;
    document.getElementById('social-score').textContent = matching.socialCompatibility;
    document.getElementById('decision-score').textContent = matching.decisionCompatibility;
    document.getElementById('lifestyle-score').textContent = matching.lifestyleCompatibility;
}

// 답변 비교 표시
function displayAnswerComparison(comparison, user1Name, user2Name, isUser1) {
    const comparisonList = document.getElementById('answer-comparison');
    comparisonList.innerHTML = '';
    // 이름 헤더 한 번만 추가 (각 열 위에 이름이 가운데 정렬로 위치)
    const header = document.createElement('div');
    header.className = 'comparison-header';
    header.innerHTML = `
        <div class="question-number"></div>
        <div class="answers" style="width: 100%; display: flex; justify-content: center; gap: 10px;">
            <span class="answer-label" style="flex:1; text-align: center;">${isUser1 ? user1Name : user2Name}</span>
            <span class="answer-label" style="flex:1; text-align: center;">${isUser1 ? user2Name : user1Name}</span>
        </div>
    `;
    comparisonList.appendChild(header);
    // 각 답변 비교
    comparison.forEach((item, index) => {
        const comparisonItem = document.createElement('div');
        comparisonItem.className = `comparison-item ${item.isMatch ? 'match' : 'different'}`;
        const myAnswer = isUser1 ? item.user1Answer : item.user2Answer;
        const otherAnswer = isUser1 ? item.user2Answer : item.user1Answer;
        comparisonItem.innerHTML = `
            <div class="question-number">질문 ${index + 1}</div>
            <div class="answers" style="width: 100%; display: flex; justify-content: center; gap: 10px;">
                <span class="answer ${item.isMatch ? 'match' : 'different'}" style="flex:1; text-align: center;">${myAnswer}</span>
                <span class="answer ${item.isMatch ? 'match' : 'different'}" style="flex:1; text-align: center;">${otherAnswer}</span>
            </div>
        `;
        comparisonList.appendChild(comparisonItem);
    });
}

// 세션 ID 복사
function copySessionId() {
    const sessionId = document.getElementById('display-session-id').textContent;
    navigator.clipboard.writeText(sessionId).then(() => {
        const copyBtn = document.getElementById('copy-session-id');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '복사됨!';
        copyBtn.style.background = '#48bb78';
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#667eea';
        }, 2000);
    });
}

// 공유 기능 (세션ID 포함)
function shareResult() {
    try {
        const user1Name = document.getElementById('result-user1')?.textContent || '';
        const user2Name = document.getElementById('result-user2')?.textContent || '';
        const overallScore = document.getElementById('overall-score')?.textContent || '';
        const shareText = `${user1Name}와 ${user2Name}의 전체 유사성: ${overallScore}%`;
        const shareUrl = `${window.location.origin}/?result=${currentSession.id}`;
        if (navigator.share) {
            navigator.share({
                title: '성향 파악 미니 퀴즈 결과',
                text: shareText,
                url: shareUrl
            });
        } else {
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
                alert('결과가 클립보드에 복사되었습니다!');
            });
        }
    } catch (e) {
        // 공유 취소(AbortError) 등은 무시
    }
}

// 앱 로드 시 result 파라미터 있으면 결과 자동 조회
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const resultSessionId = urlParams.get('result');
    if (resultSessionId) {
        currentSession = { id: resultSessionId };
        showResults();
    }
}); 