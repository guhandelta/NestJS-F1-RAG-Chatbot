import React from 'react'
import PromptSuggestionsButton from './PromptSuggestionsButton';

type Props = {}

const PromptSuggestionsRow = ({ onPromptClick }) => {

    const promptSuggestions = [
        "Who won the 2023 F1 World Championship?",
        "What is the fastest F1 lap ever recorded?",
        "Which F1 team has the most championships?",
        "Who is the youngest F1 driver to win a race?",
        "What is the longest F1 race in history?",
        "How many F1 races has Lewis Hamilton won?",
        "What is Max Verstappen's best lap time at the Monaco Grand Prix?",
        "When did Fernando Alonso make his F1 debut?",
        "What is Charles Leclerc's nationality?",
        "How many F1 World Championships has Sebastian Vettel won?",
        "What is the history of the Ferrari F1 team?",
        "Which F1 drivers have raced for Red Bull Racing?",
        "When was the Mercedes-AMG Petronas F1 Team founded?",
        "What is the McLaren F1 team's most successful era?",
        "Which F1 teams have used the Renault engine?",
        "What happened at the 2021 Abu Dhabi Grand Prix?",
        "Who won the 2023 British Grand Prix?",
        "When is the next F1 race?",
        "Where is the 2024 Italian Grand Prix held?",
        "What is the track record at the Circuit de Spa-Francorchamps?",
        "Who would win a race between Ayrton Senna and Michael Schumacher?",
        "What if Lewis Hamilton had driven for Ferrari in 2013?",
        "Which F1 car is faster, the 2023 Red Bull RB19 or the 2022 Ferrari F1-75?",
        "How would F1 be different if there were no DRS?",
        "What is the future of F1 engine regulations?",
    ];

    return (
        <div className="prompt-suggestions-row">
            {promptSuggestions.map((prompt, index) => 
                <PromptSuggestionsButton 
                    key={`suggestion-${index}`} 
                    text={prompt} 
                    /*
                        The prompt that was clicked in the <PromptSuggestionsButton /> should be supplied to the handlePrompt() in the page.tsx. The {text} clicked in the <PromptSuggestionsButton /> should be passed to the handlePrompt() function in the page.tsx. 

                        Though the prompt text can be passed to the page.tsx through the handleClick() that it had received through props from page.tsx, it is better that the prompt being passed to the page.tsx is done in this component, as the prompt text is already handled here.

                        Make it a callback function, to prevent the function from being called immediately when the component is rendered.
                    */
                    handleClick={() => onPromptClick(prompt)} 
                />)}
        </div>
    )
}

export default PromptSuggestionsRow