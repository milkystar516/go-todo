import { useEffect, type RefObject } from "react"

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClickOutside: (event: PointerEvent) => void,
) {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const element = ref.current
      const target = event.target

      if (
        !element ||
        !(target instanceof Node) ||
        element.contains(target)
      ) {
        return
      }

      onClickOutside(event)
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      )
    }
  }, [ref, onClickOutside])
}