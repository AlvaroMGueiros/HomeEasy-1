export function isScrolledToEnd(container: HTMLElement, tolerance = 64): boolean {
  return container.scrollHeight - container.clientHeight - container.scrollTop <= tolerance;
}
