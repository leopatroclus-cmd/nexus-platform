import type { ModuleManifest, ModuleContext } from '@nexus/types';
import type { Router } from 'express';

export class ModuleRegistry {
  private modules: Map<string, ModuleManifest> = new Map();

  register(manifest: ModuleManifest) {
    this.modules.set(manifest.key, manifest);
  }

  getManifest(key: string): ModuleManifest | undefined {
    return this.modules.get(key);
  }

  getAllManifests(): ModuleManifest[] {
    return this.topologicalSort();
  }

  getNavigationItems() {
    const items = [];
    for (const manifest of this.topologicalSort()) {
      if (manifest.navigation) {
        items.push({ moduleKey: manifest.key, items: manifest.navigation });
      }
    }
    return items;
  }

  getEntityTypes() {
    const types = [];
    for (const manifest of this.topologicalSort()) {
      if (manifest.entityTypes) {
        for (const et of manifest.entityTypes) {
          types.push({ ...et, moduleKey: manifest.key });
        }
      }
    }
    return types;
  }

  createRouters(ctx: ModuleContext): Array<{ key: string; router: Router }> {
    const routers = [];
    for (const manifest of this.topologicalSort()) {
      if (manifest.createRouter) {
        routers.push({ key: manifest.key, router: manifest.createRouter(ctx) });
      }
    }
    return routers;
  }

  private topologicalSort(): ModuleManifest[] {
    const visited = new Set<string>();
    const sorted: ModuleManifest[] = [];

    const visit = (key: string) => {
      if (visited.has(key)) return;
      visited.add(key);
      const manifest = this.modules.get(key);
      if (!manifest) return;
      for (const dep of manifest.dependencies || []) {
        visit(dep);
      }
      sorted.push(manifest);
    };

    for (const key of this.modules.keys()) {
      visit(key);
    }
    return sorted;
  }
}

export const registry = new ModuleRegistry();
