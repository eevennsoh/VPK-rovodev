"use client";

import type { ComponentProps, ReactNode } from "react";
import type { TProps as JsxParserProps } from "react-jsx-parser";

import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import {
	createContext,
	memo,
	useCallback,
	use,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import JsxParser from "react-jsx-parser";

interface JSXPreviewContextValue {
	jsx: string;
	processedJsx: string;
	error: Error | null;
	setError: (error: Error | null) => void;
	components: JsxParserProps["components"];
	bindings: JsxParserProps["bindings"];
	onErrorProp?: (error: Error) => void;
}

const JSXPreviewContext = createContext<JSXPreviewContextValue | null>(null);

const TAG_REGEX = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*?)(\/)?>/;

export function useJSXPreview() {
	const context = use(JSXPreviewContext);
	if (!context) {
		throw new Error("JSXPreview components must be used within JSXPreview");
	}
	return context;
}

function matchJsxTag(code: string) {
	if (code.trim() === "") {
		return null;
	}

	const match = code.match(TAG_REGEX);

	if (!match || match.index === undefined) {
		return null;
	}

	const [fullMatch, tagName, attributes, selfClosing] = match;

	let type: "self-closing" | "closing" | "opening";
	if (selfClosing) {
		type = "self-closing";
	} else if (fullMatch.startsWith("</")) {
		type = "closing";
	} else {
		type = "opening";
	}

	return {
		attributes: attributes.trim(),
		endIndex: match.index + fullMatch.length,
		startIndex: match.index,
		tag: fullMatch,
		tagName,
		type,
	};
}

function completeJsxTag(code: string) {
	const stack: string[] = [];
	let result = "";
	let currentPosition = 0;

	while (currentPosition < code.length) {
		const match = matchJsxTag(code.slice(currentPosition));
		if (!match) {
			// No more tags found, append remaining content
			result += code.slice(currentPosition);
			break;
		}
		const { tagName, type, endIndex } = match;

		// Include any text content before this tag
		result += code.slice(currentPosition, currentPosition + endIndex);

		if (type === "opening") {
			stack.push(tagName);
		} else if (type === "closing") {
			stack.pop();
		}

		currentPosition += endIndex;
	}

	return (
		result +
		stack
			.toReversed()
			.map((tag) => `</${tag}>`)
			.join("")
	);
}

export type JSXPreviewProps = Omit<ComponentProps<"div">, "onError"> & {
	jsx: string;
	isStreaming?: boolean;
	components?: JsxParserProps["components"];
	bindings?: JsxParserProps["bindings"];
	onError?: (error: Error) => void;
};

export const JSXPreview = memo(function JSXPreview({
	jsx,
	isStreaming = false,
	components,
	bindings,
	onError,
	className,
	children,
	...props
}: Readonly<JSXPreviewProps>) {
	const [prevJsx, setPrevJsx] = useState(jsx);
	const [error, setError] = useState<Error | null>(null);

	// Clear error when jsx changes (derived state pattern)
	if (jsx !== prevJsx) {
		setPrevJsx(jsx);
		setError(null);
	}

	const processedJsx = useMemo(
		() => (isStreaming ? completeJsxTag(jsx) : jsx),
		[jsx, isStreaming],
	);

	return (
		<JSXPreviewContext
			value={{
				bindings,
				components,
				error,
				jsx,
				onErrorProp: onError,
				processedJsx,
				setError,
			}}
		>
			<div className={cn("relative", className)} {...props}>
				{children}
			</div>
		</JSXPreviewContext>
	);
});

export type JSXPreviewContentProps = Omit<ComponentProps<"div">, "children">;

export const JSXPreviewContent = memo(function JSXPreviewContent({
	className,
	...props
}: Readonly<JSXPreviewContentProps>) {
	const { processedJsx, components, bindings, setError, onErrorProp } =
		useJSXPreview();
	const errorReportedRef = useRef<string | null>(null);
	const pendingErrorRef = useRef<Error | null>(null);

	// Reset error tracking when jsx changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: processedJsx change should reset tracking
	useEffect(() => {
		errorReportedRef.current = null;
	}, [processedJsx]);

	// Flush pending error to state after mount/render — JsxParser calls
	// onError synchronously during its own render, so we capture the error
	// in a ref and apply it here to avoid setState-during-render warnings.
	useEffect(() => {
		if (pendingErrorRef.current) {
			const err = pendingErrorRef.current;
			pendingErrorRef.current = null;
			setError(err);
			onErrorProp?.(err);
		}
	});

	const handleError = useCallback(
		(err: Error) => {
			// Prevent duplicate error reports for the same jsx
			if (errorReportedRef.current === processedJsx) {
				return;
			}
			errorReportedRef.current = processedJsx;
			pendingErrorRef.current = err;
		},
		[processedJsx],
	);

	return (
		<div className={cn("jsx-preview-content", className)} {...props}>
			<JsxParser
				bindings={bindings}
				components={components}
				jsx={processedJsx}
				onError={handleError}
				renderInWrapper={false}
			/>
		</div>
	);
});

export type JSXPreviewErrorProps = Omit<ComponentProps<"div">, "children"> & {
	children?: ReactNode | ((error: Error) => ReactNode);
};

function renderChildren(
	children: ReactNode | ((error: Error) => ReactNode),
	error: Error,
): ReactNode {
	if (typeof children === "function") {
		return children(error);
	}
	return children;
}

export const JSXPreviewError = memo(function JSXPreviewError({
	className,
	children,
	...props
}: Readonly<JSXPreviewErrorProps>) {
	const { error } = useJSXPreview();

	if (!error) {
		return null;
	}

	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm",
				className,
			)}
			{...props}
		>
			{children ? (
				renderChildren(children, error)
			) : (
				<>
					<AlertCircle className="size-4 shrink-0" />
					<span>{error.message}</span>
				</>
			)}
		</div>
	);
});
