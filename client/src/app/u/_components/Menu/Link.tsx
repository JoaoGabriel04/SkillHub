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
      <Link href={url} className="flex flex-col justify-between items-center">
        <FontAwesomeIcon icon={icon} className={`h-4 flex items-end text-3xl ${pathname === url ? 'text-blue-500' : ''}`} />
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