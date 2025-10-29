# **MediaFranca** <br>A Practice-Oriented Investigation into a Generative Pictographic System for Cognitive Accessibility

This doctoral research explores how a generative pictographic system can be designed to support communication for people with complex communication needs. Current augmentative and alternative communication (AAC) tools often compromise style or personal expression, limiting users' agency in daily interactions. The project tackles this issue by investigating how design practice and generative technologies can collaborate to create pictograms that are clear, adaptable, and culturally relevant.

The project applies cognitive and linguistic theories - Dual Coding Theory, Conceptual Integration Theory, and Natural Semantic Metalanguage - as well as traditions in visual communication design. These frameworks support the creation of pictograms that can depict both concrete and abstract concepts while remaining easy to understand and sensitive to context.

The research design encompasses two tracks. The first, Situated Inquiry, involves semi-structured interviews with speech therapists, teachers, carers, and designers in Aotearoa New Zealand and Chile. These participants offer valuable insights into how pictograms are taught, adapted, and assessed in real-world practice. Data are analysed thematically using Activity Theory to identify patterns, opportunities, and constraints. The second track, Formal Modelling, develops PictoNet, a generative engine that produces editable, auditable pictograms in SVG format. This track is based on technical feasibility studies, prototype development, and iterative testing.

The two tracks will converge through PictoForge, an interface where participants assess, improve, and co-create pictograms. This iterative process will take shape in an edition and evaluation interface that utilises reinforcement learning through human feedback. Validation is guided by the Visual Comprehensibility and Semantic Correspondence Index, which integrates conventional standards with context-specific validation, including clear association, semantic accuracy, dignity and cultural adaptability, and coherent graphical synthesis across the set.
This research aims to produce three interrelated outcomes that advance both theory and practice in design, cognitive accessibility, and inclusive technology: 

 1. **PictoNet**: A generative pictographic model trained on a semantically layered dataset (PICTOS), capable of producing context-sensitive pictograms that integrate cognitive principles (Dual Coding and Conceptual Integration Theory) with compositional visual rules. The model will support both concrete recognition and abstract expression through a structured, editable architecture grounded in semantic primitives. 

 2. **PictoForge**: An open, interactive interface enabling round-trip authoring - bidirectional editing between natural language input and SVG-based visual output. This tool will empower users, practitioners, and researchers to generate, inspect, modify, and retrain pictograms, ensuring outputs remain legible, culturally adaptable, and responsive to real-world communicative needs. It will function as a living testbed for iterative co-design and community feedback. 

 3. **MediaFranca**: A speculative yet actionable framework for a federated pictographic commons - a decentralised, community-governed infrastructure for the shared development and evolution of visual vocabularies. Informed by the social model of disability and convivial design principles (Illich, 1973; Murturi et al., 2023), MediaFranca proposes a governance model that balances local cultural sovereignty with semantic interoperability, resisting the centralisation and opacity of commercial AI systems. 

Together, these outcomes constitute a generative infrastructure for cognitive accessibility that repositions pictograms as editable, co-authored, and ethically grounded acts of meaning-making. The potential benefits include adding a vital component to the AAC ecosystem: a new generative channel for representation. 

By improving the adaptability and expressiveness of a generative pictographic system and providing open-source tools for communities to customise and localise, the research lays the groundwork for a federated learning system that supports cultural sovereignty within a highly unequal socio-technical environment.

----

_Read the the full [doctoral research proposal](mediafranca.md)._

----


#### The Structure

```
┌────────────────────────────────────────────────-───────────┐
│ Utterance (communicative intent)                           │
└────────────────────────────────────────────────────────────┘
                 │
                 ▼                                              ─┐
┌────────────────────────────────────────────────────────────┐   |
│ Text-preprocessing / Tokenization                          │   |
└────────────────────────────────────────────────────────────┘   |
                 │                                               |
                 ▼                                               |
┌────────────────────────────────────────────────────────────┐   |
│ Semantic Analysis (NLU) → Semantic JSON                    │   |
└────────────────────────────────────────────────────────────┘   |
                 │                                               |
                 ▼                                               |
┌────────────────────────────────────────────────────────────┐   |
│ Concept Mapping (WordNet / NSM / FrameNet) → Concept Set   │   | PictoNet
└──────────────────────────────────────────────────-─────────┘   |
                 │                                               |
                 ▼                                               |
┌────────────────────────────────────────────────────────────┐   |
│ Blending & Pragmatics Contextualisation                    │   |
└────────────────────────────────────────────────────────────┘   |
                 │                                               |
                 ▼                                               |
┌────────────────────────────────────────────────────────────┐   |
│ Layout & Styler → Structured SVG Tree                      │   |
└────────────────────────────────────────────────────────────┘   |
                 │                                               |
                 ▼                                               |
┌────────────────────────────────────────────────────────────┐   |
│  Accessibility Post-processing → Accessible SVG Output     │   |
└────────────────────────────────────────────────────────-───┘   |
                 │                                              ─┘
                 ▼                                              ─┐
┌────────────────────────────────────────────────────────────┐   |
│ Output & Local Storage Cache                               │   |
└──────────────────────────────────────────────-─────────────┘   |
                 │                                               |
         ┌───────┴────────────────Loop: If utterance exists───┐  |
         ▼                                                    │  |
┌────────────────────────────────────────────────────────────┐│  | PictoForge
│ User Edits in PictoForge → Feedback & Preference Log       ││  |
└──────────────────────────────────────────────────────-─────┘│  |
                 │                                            │  |
                 ▼                                            │  |
┌────────────────────────────────────────────────────────────┐│  |
│ Local Model Fine-tuning (Adapter Layers)                   ││  |
└────────────────────────────────────────────────────────────┘│  |
                 │                                            │ ─┘
                 ▼                                            │ ─┐
┌────────────────────────────────────────────────────────────┐│  |
│ Upload anonymised updates & feedback                       ││  |
└────────────────────────────────────────────────────────────┘│  |
                 │                                            │  |
                 ▼                                            │  |
┌────────────────────────────────────────────────────────────┐│  |
│ Federation Aggregator                                      ││  |
└────────────────────────────────────────────────────────────┘│  | MediaFranca
                 │                                            │  |
                 ▼                                            │  |
┌────────────────────────────────────────────────────────────┐│  |
│ PictoNet Parent Model — produce new global weights         ││  |
└────────────────────────────────────────────────────────────┘│  |
                 │                                            │  |
                 ▼                                            │  |
┌────────────────────────────────────────────────────────────┐│  |
│ Distribute updated model to local nodes                    ││  |
└────────────────────────────────────────────────────────────┘│  |
                 ▲                                            │ ─┘
                 └────────────────Loop continues──────────────┘
```