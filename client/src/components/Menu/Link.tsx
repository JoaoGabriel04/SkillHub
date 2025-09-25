'use client'
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  title: string,
  url: string,
  icon?: IconDefinition
}

export default function LinkItem({title, icon, url}: Props){

  const pathname = usePathname();

  if(icon) return (
    <li className="h-full text-zinc-200 font-medium hover:scale-110 hover:text-blue-500 transition-all">
      <Link href={url} className="flex flex-col justify-between items-center gap-1">
        <FontAwesomeIcon icon={icon} className={`text-3xl ${pathname === url ? 'text-blue-500' : ''}`} />
        <span className={`text-xs text-center ${pathname === url ? 'text-blue-500 font-bold' : 'font-light'}`}>{title}</span>
      </Link>
    </li>
  )
  return (
    <li className="text-lg text-zinc-200 font-medium hover:scale-110 hover:text-blue-500 transition-all">
      <Link href={url}>
        {title}
      </Link>
    </li>
  )
}