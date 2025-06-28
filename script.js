// 앱 상태 관리
let currentSession = null;
let currentUser = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let questions = [];

// API 기본 URL
const API_BASE_URL = 'https://personality-quiz-app.onrender.com/api';

// DOM 요소들
const screens = {
    start: document.getElementById('start-screen'),
    createSession: document.getElementById('create-session-screen'),
    joinSession: document.getElementById('join-session-screen'),
    sessionInfo: document.getElementById('session-info-screen'),
    quiz: document.getElementById('quiz-screen'),
    completion: document.getElementById('completion-screen'),
    result: document.getElementById('result-screen')
};

// 화면 전환 함수
function showScreen(screenId) {
    // 모든 화면 숨기기
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active', 'prev');
    });
    
    // 현재 활성화된 화면을 prev로 설정
    const currentActive = document.querySelector('.screen.active');
    if (currentActive) {
        currentActive.classList.add('prev');
    }
    
    // 새 화면 활성화
    screens[screenId].classList.add('active');
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
    try {
        const result = await apiCall(`/sessions/${currentSession.id}/answers`, {
            method: 'POST',
            body: JSON.stringify({
                userName: currentUser,
                answers: userAnswers
            })
        });
        
        if (result.completed) {
            // 모든 참여자가 완료
            showResults();
        } else {
            // 아직 다른 참여자 대기 중
            showScreen('completion');
        }
    } catch (error) {
        console.error('답변 제출 실패:', error);
    }
}

// 결과 조회
async function showResults() {
    try {
        const result = await apiCall(`/sessions/${currentSession.id}/results`);
        displayResults(result);
        showScreen('result');
    } catch (error) {
        console.error('결과 조회 실패:', error);
    }
}

// 결과 표시
function displayResults(result) {
    // 기본 정보
    document.getElementById('match-percentage').textContent = `${result.matchPercentage}%`;
    document.getElementById('result-user1').textContent = result.session.user1Name;
    document.getElementById('result-user2').textContent = result.session.user2Name;
    
    // 성향 분석 표시
    displayPersonalityAnalysis(result.personalityAnalysis);
    
    // 매칭 분석 표시
    displayMatchingAnalysis(result.matchingAnalysis);
    
    // 답변 비교 표시
    displayAnswerComparison(result.comparison);
}

// 성향 분석 표시
function displayPersonalityAnalysis(analysis) {
    // 사회성
    const user1Social = analysis.user1.socialTendency;
    const user2Social = analysis.user2.socialTendency;
    
    document.getElementById('user1-social-label').textContent = user1Social > 0 ? '외향적' : '내향적';
    document.getElementById('user2-social-label').textContent = user2Social > 0 ? '외향적' : '내향적';
    
    document.getElementById('user1-social-bar').style.width = `${Math.abs(user1Social) * 20}%`;
    document.getElementById('user2-social-bar').style.width = `${Math.abs(user2Social) * 20}%`;
    
    // 의사결정
    const user1Decision = analysis.user1.decisionStyle;
    const user2Decision = analysis.user2.decisionStyle;
    
    document.getElementById('user1-decision-label').textContent = user1Decision > 0 ? '직감적' : '분석적';
    document.getElementById('user2-decision-label').textContent = user2Decision > 0 ? '직감적' : '분석적';
    
    document.getElementById('user1-decision-bar').style.width = `${Math.abs(user1Decision) * 20}%`;
    document.getElementById('user2-decision-bar').style.width = `${Math.abs(user2Decision) * 20}%`;
}

// 매칭 분석 표시
function displayMatchingAnalysis(matching) {
    document.getElementById('overall-score').textContent = matching.overall;
    document.getElementById('social-score').textContent = matching.socialCompatibility;
    document.getElementById('decision-score').textContent = matching.decisionCompatibility;
    document.getElementById('lifestyle-score').textContent = matching.lifestyleCompatibility;
}

// 답변 비교 표시
function displayAnswerComparison(comparison) {
    const comparisonList = document.getElementById('answer-comparison');
    comparisonList.innerHTML = '';
    
    comparison.forEach((item, index) => {
        const comparisonItem = document.createElement('div');
        comparisonItem.className = `comparison-item ${item.isMatch ? 'match' : 'different'}`;
        
        comparisonItem.innerHTML = `
            <span class="question-number">질문 ${index + 1}</span>
            <div class="answers">
                <span class="answer ${item.isMatch ? 'match' : 'different'}">${item.user1Answer}</span>
                <span class="answer ${item.isMatch ? 'match' : 'different'}">${item.user2Answer}</span>
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

// 공유 기능
function shareResult() {
    const matchPercentage = document.getElementById('match-percentage').textContent;
    const user1Name = document.getElementById('result-user1').textContent;
    const user2Name = document.getElementById('result-user2').textContent;
    const shareText = `${user1Name}과 ${user2Name}의 성향 일치율: ${matchPercentage}`;
    
    if (navigator.share) {
        navigator.share({
            title: '성향 파악 미니 퀴즈 결과',
            text: shareText,
            url: window.location.href
        });
    } else {
        // 클립보드에 복사
        navigator.clipboard.writeText(shareText).then(() => {
            alert('결과가 클립보드에 복사되었습니다!');
        });
    }
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    // 시작 화면 버튼들
    document.getElementById('create-session-btn').addEventListener('click', () => {
        showScreen('createSession');
    });
    
    document.getElementById('join-session-btn').addEventListener('click', () => {
        showScreen('joinSession');
    });
    
    // 뒤로 가기 버튼들
    document.getElementById('back-to-start').addEventListener('click', () => {
        showScreen('start');
    });
    
    document.getElementById('back-to-start-2').addEventListener('click', () => {
        showScreen('start');
    });
    
    // 세션 생성
    document.getElementById('create-session').addEventListener('click', async () => {
        const user1Name = document.getElementById('create-user1-name').value.trim();
        const user2Name = document.getElementById('create-user2-name').value.trim();
        
        if (!user1Name || !user2Name) {
            alert('두 사람의 이름을 모두 입력해주세요!');
            return;
        }
        
        await createSession(user1Name, user2Name);
    });
    
    // 세션 참여
    document.getElementById('join-session').addEventListener('click', async () => {
        const sessionId = document.getElementById('session-id').value.trim();
        const userName = document.getElementById('join-user-name').value.trim();
        
        if (!sessionId || !userName) {
            alert('세션 ID와 이름을 모두 입력해주세요!');
            return;
        }
        
        await joinSession(sessionId, userName);
    });
    
    // 세션 정보 화면 버튼들
    document.getElementById('copy-session-id').addEventListener('click', copySessionId);
    
    document.getElementById('start-my-quiz').addEventListener('click', () => {
        if (!currentUser) {
            // 세션 생성자인 경우 첫 번째 사용자로 설정
            currentUser = currentSession.user1Name;
        }
        initQuiz();
        showScreen('quiz');
    });
    
    document.getElementById('check-results').addEventListener('click', showResults);
    
    // 퀴즈 화면
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const answerType = btn.dataset.type;
            handleAnswer(answerType);
        });
    });
    
    // 답변 완료 화면
    document.getElementById('back-to-session').addEventListener('click', () => {
        updateSessionInfo();
        showScreen('sessionInfo');
    });
    
    // 결과 화면
    document.getElementById('restart-quiz').addEventListener('click', () => {
        // 상태 초기화
        currentSession = null;
        currentUser = null;
        currentQuestionIndex = 0;
        userAnswers = [];
        questions = [];
        
        showScreen('start');
    });
    
    document.getElementById('share-result').addEventListener('click', shareResult);
    
    // 입력 필드 엔터 키 처리
    document.getElementById('create-user1-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('create-user2-name').focus();
        }
    });
    
    document.getElementById('create-user2-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('create-session').click();
        }
    });
    
    document.getElementById('session-id').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('join-user-name').focus();
        }
    });
    
    document.getElementById('join-user-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('join-session').click();
        }
    });
});

// 터치 이벤트 최적화
document.addEventListener('touchstart', function() {}, {passive: true});
document.addEventListener('touchmove', function() {}, {passive: true});

// 페이지 로드 시 시작 화면 표시
window.addEventListener('load', () => {
    showScreen('start');
}); 