import os

def patch_file(path, replacements):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r') as f:
        content = f.read()
    
    for target, replacement in replacements:
        if target in content:
            content = content.replace(target, replacement)
            print(f"  Applied replacement for: {target[:30]}...")
        else:
            print(f"  Warning: Target string not found in {path}: {target[:50]}...")
            
    with open(path, 'w') as f:
        f.write(content)

# src/app/game/[gameId]/page.tsx
game_path = 'src/app/game/[gameId]/page.tsx'
game_replacements = [
    # Clean up double import
    ("import { useSound } from '@/components/sound-provider';\nimport { isGuestProfile }", "import { isGuestProfile }"),
    # Fix invalid delete sound to cancel
    ("playSound('delete');", "playSound('cancel');"),
    # Fix handleHomeNavigation
    (
        "  const handleHomeNavigation = useCallback(() => {\n    if (debugResultVariant) {\n      clearDebugResult();\n      return;\n    }\n    router.push('/');\n  }, [clearDebugResult, debugResultVariant, router]);",
        "  const handleHomeNavigation = useCallback(() => {\n    playSound('cancel');\n    if (debugResultVariant) {\n      clearDebugResult();\n      return;\n    }\n    router.push('/');\n  }, [clearDebugResult, debugResultVariant, router, playSound]);"
    )
]

print("Applying definitive patches...")
patch_file(game_path, game_replacements)
print("Done.")
