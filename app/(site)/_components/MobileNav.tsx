"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ButtonLink from "@/components/button-link";
import { ChatIcon } from "@/components/contact-icons";
import NavLinks from "./NavLinks";

// Phones and small tablets: the section links and Get in touch in a sheet
// from the right. Picking anything closes it
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          // A 44px target that doesn't push the header
          <Button variant="ghost" size="icon-lg" className="-my-2 -mr-2 md:hidden" />
        }
        aria-label="Open menu"
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Sections" className="px-4">
          <NavLinks orientation="column" onNavigate={close} />
        </nav>
        <SheetFooter onClick={close}>
          <ButtonLink href="#contact" icon={<ChatIcon />} track={{ event: "contact_click", method: "contact_open", location: "sheet" }}>
            Get in touch
          </ButtonLink>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
