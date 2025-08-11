import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface QuestionCardProps {
  question: { id: string; text: string; options: string[] };
  onAnswerChange: (questionId: string, value: string) => void;
  disabled: boolean;
}

export function QuestionCard({ question, onAnswerChange, disabled }: QuestionCardProps) {
  return (
    <div className="space-y-2">
      <p className="font-medium">{question.text}</p>
      <RadioGroup
        onValueChange={(value) => onAnswerChange(question.id, value)}
        disabled={disabled}
      >
        {question.options.map((option, index) => (
          <div key={index} className="flex items-center space-x-2">
            <RadioGroupItem
              value={index.toString()}
              id={`${question.id}-${index}`}
            />
            <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}