"use client";

import Image from "next/image";
import logo from "./assets/logo.png";
import { useChat } from "ai/react";

export default function Home() {

    const { append, isLoading, messages, input, handleInputChange, handleSubmit } = useChat();

    const noMessagea = true;

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
                        {/* <PromptSuggestionRow /> */}
                    </>
                ) : (
                    <>
                        {/* Map messages onto text bubbles */}
                        {/* <LoadingBubble /> */}
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