const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 메모리 데이터 저장소 (실제 프로덕션에서는 데이터베이스 사용)
const sessions = new Map();
const userAnswers = new Map();

// 퀴즈 질문 데이터
const questions = [
    {
        id: 1,
        question: "새로운 사람을 만날 때 나는...",
        options: {
            A: "적극적으로 대화를 시작한다",
            B: "상대방이 먼저 말을 걸어주기를 기다린다"
        }
    },
    {
        id: 2,
        question: "주말에 나는 주로...",
        options: {
            A: "친구들과 만나서 놀거나 활동적인 일을 한다",
            B: "집에서 혼자만의 시간을 보내거나 조용히 쉰다"
        }
    },
    {
        id: 3,
        question: "문제가 생겼을 때 나는...",
        options: {
            A: "즉시 해결책을 찾아 행동한다",
            B: "충분히 생각하고 신중하게 결정한다"
        }
    },
    {
        id: 4,
        question: "새로운 환경에 적응할 때...",
        options: {
            A: "빠르게 적응하고 새로운 것들을 시도한다",
            B: "천천히 익숙해지면서 안정적으로 적응한다"
        }
    },
    {
        id: 5,
        question: "감정 표현에 대해...",
        options: {
            A: "솔직하게 표현하는 편이다",
            B: "조심스럽게 표현하거나 숨기는 편이다"
        }
    },
    {
        id: 6,
        question: "계획을 세울 때...",
        options: {
            A: "대략적인 방향만 잡고 유연하게 진행한다",
            B: "세부사항까지 꼼꼼하게 계획한다"
        }
    },
    {
        id: 7,
        question: "스트레스 해소 방법은...",
        options: {
            A: "운동이나 활동적인 방법을 선호한다",
            B: "독서나 음악 등 조용한 방법을 선호한다"
        }
    },
    {
        id: 8,
        question: "의사결정을 할 때...",
        options: {
            A: "직감과 감정에 따라 빠르게 결정한다",
            B: "논리와 분석을 통해 신중하게 결정한다"
        }
    },
    {
        id: 9,
        question: "새로운 기술이나 정보를 배울 때...",
        options: {
            A: "실습을 통해 직접 경험하며 배운다",
            B: "이론을 먼저 이해하고 체계적으로 배운다"
        }
    },
    {
        id: 10,
        question: "미래에 대해 생각할 때...",
        options: {
            A: "긍정적이고 낙관적으로 생각한다",
            B: "현실적이고 신중하게 생각한다"
        }
    }
];

// 성향 분석 함수
function analyzePersonality(answers) {
    const analysis = {
        socialTendency: 0, // 사회성 (A: 외향적, B: 내향적)
        decisionStyle: 0,  // 의사결정 스타일 (A: 직감적, B: 분석적)
        stressManagement: 0, // 스트레스 관리 (A: 활동적, B: 조용한)
        planningStyle: 0,  // 계획 스타일 (A: 유연한, B: 체계적)
        emotionalExpression: 0 // 감정 표현 (A: 솔직한, B: 조심스러운)
    };
    
    // 각 질문별 성향 분석
    answers.forEach((answer, index) => {
        switch(index) {
            case 0: // 새로운 사람을 만날 때
                analysis.socialTendency += answer === 'A' ? 1 : -1;
                break;
            case 1: // 주말 활동
                analysis.socialTendency += answer === 'A' ? 1 : -1;
                break;
            case 2: // 문제 해결
                analysis.decisionStyle += answer === 'A' ? 1 : -1;
                break;
            case 3: // 환경 적응
                analysis.socialTendency += answer === 'A' ? 1 : -1;
                break;
            case 4: // 감정 표현
                analysis.emotionalExpression += answer === 'A' ? 1 : -1;
                break;
            case 5: // 계획 세우기
                analysis.planningStyle += answer === 'A' ? 1 : -1;
                break;
            case 6: // 스트레스 해소
                analysis.stressManagement += answer === 'A' ? 1 : -1;
                break;
            case 7: // 의사결정
                analysis.decisionStyle += answer === 'A' ? 1 : -1;
                break;
            case 8: // 학습 방법
                analysis.decisionStyle += answer === 'A' ? 1 : -1;
                break;
            case 9: // 미래에 대한 생각
                analysis.emotionalExpression += answer === 'A' ? 1 : -1;
                break;
        }
    });
    
    return analysis;
}

// 매칭 분석 함수
function analyzeMatching(user1Analysis, user2Analysis) {
    const matching = {
        overall: 0,
        socialCompatibility: 0,
        decisionCompatibility: 0,
        lifestyleCompatibility: 0,
        communicationCompatibility: 0
    };
    
    // 사회성 호환성 (비슷할수록 높은 점수)
    const socialDiff = Math.abs(user1Analysis.socialTendency - user2Analysis.socialTendency);
    matching.socialCompatibility = Math.max(0, 100 - (socialDiff * 20));
    
    // 의사결정 호환성 (비슷할수록 높은 점수)
    const decisionDiff = Math.abs(user1Analysis.decisionStyle - user2Analysis.decisionStyle);
    matching.decisionCompatibility = Math.max(0, 100 - (decisionDiff * 20));
    
    // 라이프스타일 호환성 (비슷할수록 높은 점수)
    const lifestyleDiff = Math.abs(user1Analysis.stressManagement - user2Analysis.stressManagement);
    matching.lifestyleCompatibility = Math.max(0, 100 - (lifestyleDiff * 20));
    
    // 소통 호환성 (비슷할수록 높은 점수)
    const communicationDiff = Math.abs(user1Analysis.emotionalExpression - user2Analysis.emotionalExpression);
    matching.communicationCompatibility = Math.max(0, 100 - (communicationDiff * 20));
    
    // 전체 호환성
    matching.overall = Math.round(
        (matching.socialCompatibility + 
         matching.decisionCompatibility + 
         matching.lifestyleCompatibility + 
         matching.communicationCompatibility) / 4
    );
    
    return matching;
}

// API 라우트

// 퀴즈 세션 생성
app.post('/api/sessions', (req, res) => {
    const { user1Name, user2Name } = req.body;
    
    if (!user1Name || !user2Name) {
        return res.status(400).json({ error: '두 사람의 이름이 필요합니다.' });
    }
    
    const sessionId = uuidv4();
    const session = {
        id: sessionId,
        user1Name,
        user2Name,
        user1Completed: false,
        user2Completed: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료
    };
    
    sessions.set(sessionId, session);
    
    res.json({
        sessionId,
        user1Name,
        user2Name,
        questions: questions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options
        }))
    });
});

// 세션 정보 조회
app.get('/api/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    }
    
    res.json(session);
});

// 답변 제출
app.post('/api/sessions/:sessionId/answers', (req, res) => {
    const { sessionId } = req.params;
    const { userName, answers } = req.body;
    
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    }
    
    if (answers.length !== questions.length) {
        return res.status(400).json({ error: '모든 질문에 답변해주세요.' });
    }
    
    // 사용자 확인
    if (userName !== session.user1Name && userName !== session.user2Name) {
        return res.status(403).json({ error: '세션에 참여하지 않은 사용자입니다.' });
    }
    
    // 답변 저장
    const userKey = `${sessionId}_${userName}`;
    userAnswers.set(userKey, {
        userName,
        answers,
        submittedAt: new Date(),
        personalityAnalysis: analyzePersonality(answers)
    });
    
    // 완료 상태 업데이트
    if (userName === session.user1Name) {
        session.user1Completed = true;
    } else {
        session.user2Completed = true;
    }
    
    sessions.set(sessionId, session);
    
    res.json({ 
        message: '답변이 제출되었습니다.',
        completed: session.user1Completed && session.user2Completed
    });
});

// 결과 조회
app.get('/api/sessions/:sessionId/results', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    }
    
    if (!session.user1Completed || !session.user2Completed) {
        return res.status(400).json({ error: '아직 모든 참여자가 답변을 완료하지 않았습니다.' });
    }
    
    const user1Key = `${sessionId}_${session.user1Name}`;
    const user2Key = `${sessionId}_${session.user2Name}`;
    
    const user1Data = userAnswers.get(user1Key);
    const user2Data = userAnswers.get(user2Key);
    
    if (!user1Data || !user2Data) {
        return res.status(404).json({ error: '답변 데이터를 찾을 수 없습니다.' });
    }
    
    // 일치율 계산
    let matchCount = 0;
    const comparison = [];
    
    for (let i = 0; i < questions.length; i++) {
        const isMatch = user1Data.answers[i] === user2Data.answers[i];
        if (isMatch) matchCount++;
        
        comparison.push({
            questionId: questions[i].id,
            question: questions[i].question,
            user1Answer: questions[i].options[user1Data.answers[i]],
            user2Answer: questions[i].options[user2Data.answers[i]],
            isMatch
        });
    }
    
    const matchPercentage = Math.round((matchCount / questions.length) * 100);
    
    // 성향 분석 및 매칭 분석
    const matchingAnalysis = analyzeMatching(user1Data.personalityAnalysis, user2Data.personalityAnalysis);
    
    res.json({
        session: {
            id: sessionId,
            user1Name: session.user1Name,
            user2Name: session.user2Name
        },
        matchPercentage,
        comparison,
        personalityAnalysis: {
            user1: user1Data.personalityAnalysis,
            user2: user2Data.personalityAnalysis
        },
        matchingAnalysis
    });
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`API 문서: http://localhost:${PORT}/api`);
}); 