"use client";

import Image from "next/image";
import logo from "./assets/logo.png";
import { useChat } from "ai/react";

import { Bubble, LoadingBubble, PromptSuggestionsRow } from "./components"
import { Message } from "ai";

export default function Home() {

    const { append, isLoading, messages, input, handleInputChange, handleSubmit } = useChat();

    const noMessagea = false;

    const handlePrompt = (promptText) => {

        const msg: Message = {
            id: crypto.randomUUID(),
            content: promptText,
            role: "user",
        };

        append(msg);
    }

    return (
        <main>
            <Image src={logo} alt="F1 GPT Logo" width={250} />
            <section className={noMessagea ? "":"populated"}>
                {noMessagea ? (
                    <>
                        <p className="starter-text">
                            The Ultimate place for Formula One, super fans!
                            Ask F1GPT anything about the fantastic topic of F1 racing and it will come back with the most up-to-date answers.
                            We hope you enjoy!
                        </p>
                        <br />
                        <PromptSuggestionsRow onPromptClick={handlePrompt} />
                    </>
                ) : (
                    <>
                        {messages.map((message, index) => <Bubble key={`message-${index}`} message={message} />)}
                        <LoadingBubble />
                    </>
                )}

            </section>
            <form onSubmit={handleSubmit}>
                <input type="text" className="question-box" onChange={handleInputChange} value={input} placeholder="Ask me anything about F1 Raching" />
                <input type="submit" />
            </form>
        </main>
    );
}

// export default Home