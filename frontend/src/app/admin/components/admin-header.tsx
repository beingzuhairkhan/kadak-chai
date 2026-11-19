type Props = { title: string };

export function AdminHeader({ title }: Props) {
  return (
    <header className="flex h-[62px] items-center justify-between border-b border-[#ead9c6] bg-white px-5 sm:px-7">
      <h1 className="text-[17px] font-bold text-[#2b1a12]">{title}</h1>
      <span className="grid size-8 place-items-center rounded-full bg-[#8d4b2d] text-sm font-bold text-white" aria-label="Admin profile">A</span>
    </header>
  );
}
