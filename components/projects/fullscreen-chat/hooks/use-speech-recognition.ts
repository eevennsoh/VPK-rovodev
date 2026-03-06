"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface UseSpeechRecognitionOptions {
	lang?: string;
	continuous?: boolean;
	interimResults?: boolean;
	onFinalTranscript?: (transcript: string) => void;
}

interface UseSpeechRecognitionReturn {
	isListening: boolean;
	interimText: string;
	isSupported: boolean;
	toggleDictation: () => void;
	startListening: () => void;
	stopListening: () => void;
}

export function useSpeechRecognition(options: Readonly<UseSpeechRecognitionOptions> = {}): UseSpeechRecognitionReturn {
	const { lang = "en-US", continuous = true, interimResults = true, onFinalTranscript } = options;

	const [isListening, setIsListening] = useState(false);
	const [interimText, setInterimText] = useState("");
	const isSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const onFinalTranscriptRef = useRef(onFinalTranscript);

	// Keep callback ref in sync
	useEffect(() => {
		onFinalTranscriptRef.current = onFinalTranscript;
	}, [onFinalTranscript]);

	// Initialize speech recognition
	useEffect(() => {
		if (typeof window === "undefined" || !isSupported) return;

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		if (!SpeechRecognition) return;
		const recognition = new SpeechRecognition();
		recognition.continuous = continuous;
		recognition.interimResults = interimResults;
		recognition.lang = lang;

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			let finalTranscript = "";
			let interimTranscript = "";

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const transcript = event.results[i][0].transcript;
				if (event.results[i].isFinal) {
					finalTranscript += transcript;
				} else {
					interimTranscript += transcript;
				}
			}

			// Update interim text for live display
			setInterimText(interimTranscript);

			// Call callback when we have final results
			if (finalTranscript && onFinalTranscriptRef.current) {
				onFinalTranscriptRef.current(finalTranscript);
				setInterimText(""); // Clear interim text after adding final text
			}
		};

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			console.error("Speech recognition error:", event.error);
			setIsListening(false);
			setInterimText("");
		};

		recognition.onend = () => {
			setIsListening(false);
			setInterimText("");
		};

		recognitionRef.current = recognition;

		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.stop();
			}
		};
	}, [lang, continuous, interimResults, isSupported]);

	const startListening = useCallback(() => {
		if (!recognitionRef.current) {
			alert("Speech recognition is not supported in your browser");
			return;
		}
		recognitionRef.current.start();
		setIsListening(true);
	}, []);

	const stopListening = useCallback(() => {
		if (recognitionRef.current) {
			recognitionRef.current.stop();
			setIsListening(false);
			setInterimText("");
		}
	}, []);

	const toggleDictation = useCallback(() => {
		if (isListening) {
			stopListening();
		} else {
			startListening();
		}
	}, [isListening, startListening, stopListening]);

	return {
		isListening,
		interimText,
		isSupported,
		toggleDictation,
		startListening,
		stopListening,
	};
}
