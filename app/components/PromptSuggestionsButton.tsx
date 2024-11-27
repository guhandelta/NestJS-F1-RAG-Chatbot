import React from 'react'

const PromptSuggestionsButton = ({ text, handleClick }) => {
    return (
        <button 
            className="promptSuggestionsButton" 
            onClick={handleClick}
        >
            {text}
        </button>
    )
}

export default PromptSuggestionsButton