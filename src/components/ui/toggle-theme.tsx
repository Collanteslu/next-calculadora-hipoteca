"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

type ThemeOption = {
  value: string
  label: string
  icon: React.ReactNode
}

const THEMES: Record<string, ThemeOption> = {
  light: { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
  dark: { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
}

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const currentTheme = THEMES[theme ?? ""]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {theme === "light" ? (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          ) : theme === "dark" ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Palette className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Tema actual: {currentTheme?.label ?? theme}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center gap-2.5"
        >
          <Sun className="h-4 w-4 text-amber-500" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center gap-2.5"
        >
          <Moon className="h-4 w-4 text-indigo-400" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center gap-2.5"
        >
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span>System</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Temas de editor
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme("monokai")}
          className="flex items-center gap-2.5"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#F92672] text-[8px] font-bold text-white">
            M
          </span>
          <span>Monokai</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("tokyo-night")}
          className="flex items-center gap-2.5"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#7AA2F7] text-[8px] font-bold text-[#1A1B26]">
            T
          </span>
          <span>Tokyo Night</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("nord")}
          className="flex items-center gap-2.5"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#5E81AC] text-[8px] font-bold text-white">
            N
          </span>
          <span>Nord</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dracula")}
          className="flex items-center gap-2.5"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#FF79C6] text-[8px] font-bold text-[#282A36]">
            D
          </span>
          <span>Dracula</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
