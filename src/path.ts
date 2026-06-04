type Split<Path extends string> = string extends Path
  ? string[]
  : Path extends ""
    ? []
    : Path extends `/${infer Tail}`
      ? Split<Tail>
      : Path extends `${infer Head}/${infer Tail}`
        ? [Head, ...Split<Tail>]
        : [Path]

type SegmentParam<Segment extends string> = Segment extends `{${infer Param}=**}`
  ? Param
  : Segment extends `{${infer Param}=*}`
    ? Param
    : Segment extends `{${infer Param}}`
      ? Param
      : never

export type PathParams<Path extends string> = string extends Path
  ? Record<string, string>
  : {
      [Key in SegmentParam<Split<Path>[number]>]: string
    }

export interface TypedPath<Path extends string> {
  readonly path: Path
}

export function path<const Path extends string>(path: Path): TypedPath<Path> {
  return { path }
}
