type Props = {
  children?: React.ReactNode;
}

export default function SocialLogin({ children }: Props) {
  return (
    <main className="w-24 h-12 p-1 text-3xl text-zinc-200/60 border-1 border-zinc-200 bg-dark-primary shadow-primary rounded flex items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors group">
      {children}
    </main>
  )
}