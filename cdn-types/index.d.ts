// Minimal ambient declarations for CDN builds (no node_modules required).
// These satisfy the TypeScript compiler when @types/* packages are not installed.

// Allow CSS side-effect imports (e.g. import './App.css')
declare module '*.css' {}

// Allow import.meta.env (Vite convention; build-cdn.sh replaces at runtime)
interface ImportMeta {
  readonly env: {
    readonly BASE_URL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
    [key: string]: any;
  };
}

declare module 'react' {
  export type FC<P = {}> = (props: P & { children?: any }) => any;
  export type ReactNode = any;
  export type ReactElement = any;
  export type CSSProperties = { [key: string]: any };
  export type ChangeEvent<T = Element> = { target: T & { value: string; checked: boolean } };
  export type FormEvent<T = Element> = { preventDefault(): void; target: T };
  export type MouseEvent<T = Element> = { preventDefault(): void; target: T };
  export type KeyboardEvent<T = Element> = { key: string; preventDefault(): void };
  export type Dispatch<A> = (action: A) => void;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export type MutableRefObject<T> = { current: T };
  export type RefObject<T> = { readonly current: T | null };
  export type Context<T> = any;
  export type Reducer<S, A> = (state: S, action: A) => S;
  export function createElement(type: any, props?: any, ...children: any[]): any;
  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useRef<T>(initial: T): MutableRefObject<T>;
  export function useRef<T>(initial: T | null): RefObject<T>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  export function useContext(ctx: any): any;
  export function useReducer<S, A>(reducer: Reducer<S, A>, initial: S, init?: any): [S, Dispatch<A>];
  export function createContext<T = any>(defaultValue?: T): any;
  export function memo<T extends (...args: any[]) => any>(component: T): T;
  export function forwardRef<T, P = {}>(render: (props: P, ref: any) => any): any;
  export const Fragment: any;
  export const StrictMode: any;
  export const Suspense: any;
  export default any;
}

// Make 'React' available as a global namespace (for React.FC, React.ReactNode, etc.)
declare namespace React {
  type FC<P = {}> = (props: P & { children?: any }) => any;
  type ReactNode = any;
  type ReactElement = any;
  type CSSProperties = { [key: string]: any };
  type ChangeEvent<T = Element> = { target: T & { value: string; checked: boolean } };
  type FormEvent<T = Element> = { preventDefault(): void };
  type MouseEvent<T = Element> = { preventDefault(): void; stopPropagation(): void; target: T };
  type KeyboardEvent<T = Element> = { key: string; preventDefault(): void };
  type Dispatch<A> = (action: A) => void;
  type SetStateAction<S> = S | ((prev: S) => S);
  type MutableRefObject<T> = { current: T };
  type RefObject<T> = { readonly current: T | null };
  type Reducer<S, A> = (state: S, action: A) => S;
  type Context<T> = any;
  type PropsWithChildren<P = {}> = P & { children?: any };
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}

declare module 'react-dom' {
  export function render(element: any, container: Element | null): void;
  export function unmountComponentAtNode(container: Element): boolean;
  export const createPortal: any;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | null): { render(element: any): void; unmount(): void };
}

declare module 'react-router-dom' {
  export const BrowserRouter: any;
  export const HashRouter: any;
  export const Routes: any;
  export const Route: any;
  export const Link: any;
  export const NavLink: any;
  export const Navigate: any;
  export const Outlet: any;
  export function useNavigate(): (to: string, options?: any) => void;
  export function useLocation(): { pathname: string; search: string; hash: string; state: any };
  export function useParams<T extends Record<string, string> = Record<string, string>>(): T;
  export function useSearchParams(): [URLSearchParams, (p: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => void];
}
