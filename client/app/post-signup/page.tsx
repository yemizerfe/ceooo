"use client";

import { useState } from "react";

export default function Postsignup() {
    const [name, fullName] = useState<string|null>(null);
    const [companyName, setCompanyName] = useState<string|null>(null);
    return (
        <div>
            {/* Post signup page content */}
        </div>
    )
}