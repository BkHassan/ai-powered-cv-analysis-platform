export class QuizResponseDto {
    quizId: string;
    cvId: string;
    questions: {
      question: string;
      options: string[];
      correctAnswer: string;
    }[];
    secureLink: string;
    createdAt: string;
    createdBy: string;
  }