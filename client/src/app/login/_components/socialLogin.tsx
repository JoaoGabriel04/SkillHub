type Props = {
  children?: React.ReactNode;
}

export default function SocialLogin({ children }: Props) {
  return (
    <main className="w-24 h-12 p-1 text-3xl text-zinc-200/60 bg-dark-primary shadow-primary rounded-md flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors group">
      {children}
    </main>
  )
}