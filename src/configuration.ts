interface Configuration {
    sort: string;
    template: string;
    pr_template: string;
    empty_template: string;
    categories: Array<Category>;
    transformers: Array<Transformer>;
}

interface Category {
    title: string;
    labels: Array<string>;
}

interface Transformer {
    pattern: string;
    target: string;
}

const DefaultConfiguration: Configuration = {
    sort: "ASC",
    template: "${{CHANGELOG}}",
    pr_template: "- ${{TITLE}}\n   - PR: #${{NUMBER}}",
    empty_template: "- no changes",
    categories: [],
    transformers: []
}
