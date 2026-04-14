import os
import re

def patch_file(path, replacements):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r') as f:
        content = f.read()
    
    for target, replacement in replacements:
        if target in content:
            content = content.replace(target, replacement)
            print(f"  Applied: {target[:20]}...")
        else:
            print(f"  Warning: Target string not found in {path}: {target[:40]}...")
            
    with open(path, 'w') as f:
        f.write(content)

# 1. Patch src/app/game/[gameId]/page.tsx
game_path = 'src/app/game/[gameId]/page.tsx'
game_replacements = [
    (
        "import { ChatDock } from '@/components/chat-dock';",
        "import { ChatDock } from '@/components/chat-dock';\nimport { useSound } from '@/components/sound-provider';"
    ),
    (
        "  const { toast } = useToast();\n  const gameId = params?.gameId as string;",
        "  const { toast } = useToast();\n  const { playSound } = useSound();\n  const gameId = params?.gameId as string;"
    ),
    (
        "      const isRealWord = await validateWord(guess);\n      if (!isRealWord) {\n        playSound('delete');",
        "      const isRealWord = await validateWord(guess);\n      if (!isRealWord) {\n        playSound('wrong');"
    ),
    (
        "      await updateDoc(gameRef, updatePayload);\n      setLockedIndices(new Set());",
        "      await updateDoc(gameRef, updatePayload);\n\n      // Play result sound if it's not a terminal state (win/loss already handled)\n      if (!isWin && !outOfAttempts) {\n        if (evaluations.includes('correct')) {\n          playSound('success_green');\n        } else if (evaluations.includes('present')) {\n          playSound('success_orange');\n        } else {\n          playSound('wrong');\n        }\n      }\n\n      setLockedIndices(new Set());"
    ),
    (
        "  const handleKeyboardSubmit = useCallback(() => {\n    playSound('pop');",
        "  const handleKeyboardSubmit = useCallback(() => {\n    playSound('tap');"
    ),
    (
        "  const handleKeyboardReset = useCallback(() => {\n    setCurrentGuess(' '.repeat(game?.wordLength ?? 5));",
        "  const handleKeyboardReset = useCallback(() => {\n    playSound('cancel');\n    setCurrentGuess(' '.repeat(game?.wordLength ?? 5));"
    ),
    (
        "  const removeLetter = useCallback(() => {\n    if (isSubmitting) return;",
        "  const removeLetter = useCallback(() => {\n    if (isSubmitting) return;\n    playSound('cancel');"
    ),
    (
        "  const handleHomeNavigation = useCallback(() => {\n    router.push('/');\n  }, [router]);",
        "  const handleHomeNavigation = useCallback(() => {\n    playSound('cancel');\n    router.push('/');\n  }, [router, playSound]);"
    )
]

# 2. Patch src/app/lobby/[gameId]/page.tsx
lobby_path = 'src/app/lobby/[gameId]/page.tsx'
lobby_replacements = [
    (
        "import { useFirebase } from '@/components/firebase-provider';\nimport { Button } from '@/components/ui/button';",
        "import { useFirebase } from '@/components/firebase-provider';\nimport { useSound } from '@/components/sound-provider';\nimport { Button } from '@/components/ui/button';"
    ),
    (
        "  const { db, userId, user, profile } = useFirebase();\n  const { resolvedTheme } = useTheme();",
        "  const { db, userId, user, profile } = useFirebase();\n  const { playSound } = useSound();\n  const { resolvedTheme } = useTheme();"
    ),
    (
        "            toast({ title: 'Players ready', description: 'Launching the board…' });\n          } catch (error) {",
        "            toast({ title: 'Players ready', description: 'Launching the board…' });\n            playSound('ready');\n          } catch (error) {"
    ),
    (
        "    try {\n      await navigator.clipboard.writeText(inviteLink);\n      setIsCopied(true);",
        "    try {\n      await navigator.clipboard.writeText(inviteLink);\n      setIsCopied(true);\n      playSound('pop_tap');"
    ),
    (
        "  const handleReturnHome = useCallback(() => {\n    router.push('/');\n  }, [router]);",
        "  const handleReturnHome = useCallback(() => {\n    playSound('cancel');\n    router.push('/');\n  }, [router, playSound]);"
    ),
    (
        "      rememberLobbyPasscode(gameId, trimmedPasscode);\n      setRememberedPasscode(trimmedPasscode);\n      setPasscodeInput('');\n      // Clear the query param from URL",
        "      rememberLobbyPasscode(gameId, trimmedPasscode);\n      setRememberedPasscode(trimmedPasscode);\n      setPasscodeInput('');\n      playSound('ready');\n      // Clear the query param from URL"
    ),
    (
        "    try {\n      await navigator.clipboard.writeText(passcodeDisplayValue);\n      setIsPasscodeCopied(true);",
        "    try {\n      await navigator.clipboard.writeText(passcodeDisplayValue);\n      setIsPasscodeCopied(true);\n      playSound('pop_tap');"
    )
]

print("Applying patches...")
patch_file(game_path, game_replacements)
patch_file(lobby_path, lobby_replacements)
print("Done.")
