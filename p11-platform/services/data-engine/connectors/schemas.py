"""
JSON Schemas for OpenAI structured outputs
Matches TypeScript schema definitions exactly
"""

# Natural Extraction Envelope Schema (for Phase 2 analysis)
NATURAL_EXTRACTION_ENVELOPE_SCHEMA = {
    "type": "object",
    "required": ["answer_block", "analysis"],
    "additionalProperties": False,
    "properties": {
        "answer_block": {
            "type": "object",
            "required": ["ordered_entities", "citations", "answer_summary", "notes"],
            "additionalProperties": False,
            "properties": {
                "ordered_entities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "domain", "rationale", "position"],
                        "additionalProperties": False,
                        "properties": {
                            "name": {"type": "string"},
                            "domain": {"type": "string"},
                            "rationale": {"type": "string"},
                            "position": {"type": "integer", "minimum": 1}
                        }
                    }
                },
                "citations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["url", "domain", "entity_ref"],
                        "additionalProperties": False,
                        "properties": {
                            "url": {"type": "string"},
                            "domain": {"type": "string"},
                            "entity_ref": {"type": "string"}
                        }
                    }
                },
                "answer_summary": {"type": "string"},
                "notes": {
                    "type": "object",
                    "required": ["flags"],
                    "additionalProperties": False,
                    "properties": {
                        "flags": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": [
                                    "no_sources",
                                    "possible_hallucination",
                                    "outdated_info",
                                    "nap_mismatch",
                                    "conflicting_prices"
                                ]
                            }
                        }
                    }
                }
            }
        },
        "analysis": {
            "type": "object",
            "required": ["ordered_entities", "citations", "brand_analysis", "extraction_confidence"],
            "additionalProperties": False,
            "properties": {
                "ordered_entities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": [
                            "name",
                            "domain",
                            "position",
                            "prominence",
                            "mention_count",
                            "first_mention_quote"
                        ],
                        "additionalProperties": False,
                        "properties": {
                            "name": {"type": "string"},
                            "domain": {"type": "string"},
                            "position": {"type": "integer", "minimum": 1},
                            "prominence": {"type": "string"},
                            "mention_count": {"type": "integer", "minimum": 0},
                            "first_mention_quote": {"type": "string"}
                        }
                    }
                },
                "citations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["url", "domain", "citation_type"],
                        "additionalProperties": False,
                        "properties": {
                            "url": {"type": "string"},
                            "domain": {"type": "string"},
                            "citation_type": {"type": "string", "enum": ["explicit", "inferred"]}
                        }
                    }
                },
                "brand_analysis": {
                    "type": "object",
                    "required": ["mentioned", "position", "location_stated", "location_correct", "prominence"],
                    "additionalProperties": False,
                    "properties": {
                        "mentioned": {"type": "boolean"},
                        "position": {"anyOf": [{"type": "integer", "minimum": 1}, {"type": "null"}]},
                        "location_stated": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                        "location_correct": {"anyOf": [{"type": "boolean"}, {"type": "null"}]},
                        "prominence": {"anyOf": [{"type": "string"}, {"type": "null"}]}
                    }
                },
                "extraction_confidence": {"type": "number", "minimum": 0, "maximum": 100}
            }
        }
    }
}


