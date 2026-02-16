"use client"

import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react"

interface UseControllableStateParams<T> {
	prop?: T | undefined
	defaultProp: T
	onChange?: (state: T) => void
}

type SetStateFn<T> = Dispatch<SetStateAction<T>>

export function useControllableState<T>({
	prop,
	defaultProp,
	onChange,
}: UseControllableStateParams<T>): [T, SetStateFn<T>] {
	const [uncontrolledProp, setUncontrolledProp] = useState(defaultProp)
	const isControlled = prop !== undefined
	const value = isControlled ? prop : uncontrolledProp
	const valueRef = useRef(value)
	const onChangeRef = useRef(onChange)
	const isControlledRef = useRef(isControlled)

	useEffect(() => {
		valueRef.current = value
	}, [value])

	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	useEffect(() => {
		isControlledRef.current = isControlled
	}, [isControlled])

	const setValue = useCallback<SetStateFn<T>>(
		(nextValue) => {
			const currentValue = valueRef.current
			const valueToSet =
				typeof nextValue === "function"
					? (nextValue as (prevState: T) => T)(currentValue)
					: nextValue

			if (!Object.is(currentValue, valueToSet)) {
				if (!isControlledRef.current) {
					setUncontrolledProp(valueToSet)
				}
				onChangeRef.current?.(valueToSet)
			}
		},
		[]
	)

	return [value, setValue]
}
