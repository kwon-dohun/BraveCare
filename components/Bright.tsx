"use client";
import { useEffect } from "react";
import { toApp } from "@/lib/app";

// 진료실에서 보여주는 화면: 앱에서는 열려 있는 동안 화면 밝기를 최대로 올리고, 닫으면 되돌린다. 웹에서는 아무 일도 하지 않는다.
export default function Bright() {
  useEffect(() => {
    toApp({ t: "bright", on: true });
    return () => { toApp({ t: "bright", on: false }); };
  }, []);
  return null;
}
