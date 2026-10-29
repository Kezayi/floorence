export let handler: ((req: Request) => Response | Promise<Response>) | undefined;
export function serve(next: (req: Request) => Response | Promise<Response>) { handler = next; }